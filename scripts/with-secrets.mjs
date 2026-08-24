#!/usr/bin/env node
/**
 * .env 파일 없이 Google Secret Manager 에서 환경변수를 받아
 * 자식 프로세스에 주입하고 실행하는 래퍼.
 *
 * 사용:
 *   node scripts/with-secrets.mjs <명령> [인자...]
 *   node scripts/with-secrets.mjs expo start
 *   node scripts/with-secrets.mjs expo run:android
 *
 * 로컬 인증 준비 (최초 1회):
 *   gcloud auth application-default login
 *
 * 다른 시크릿을 쓰려면 ENV_SECRET 환경변수로 전체 리소스 이름을 지정한다.
 *   예) ENV_SECRET=projects/lightnig-bunyang/secrets/lightby-app-env-prod/versions/latest
 */
import { spawn } from 'node:child_process';

const DEFAULT_SECRET =
  'projects/lightnig-bunyang/secrets/lightby-app-env-dev/versions/latest';

const [command, ...commandArgs] = process.argv.slice(2);

if (!command) {
  console.error('사용법: node scripts/with-secrets.mjs <명령> [인자...]');
  process.exit(1);
}

// SKIP_SECRETS=1 이면 Secret Manager 를 건너뛰고 현재 환경변수 그대로 실행한다.
// (도커 빌드처럼 ADC 가 없고 --build-arg 로 값이 이미 주입된 환경용)
// 실제 환경변수가 시크릿 값보다 항상 우선한다.
const env =
  process.env.SKIP_SECRETS === '1'
    ? { ...process.env }
    : { ...parseEnv(await fetchBlob()), ...process.env };

async function fetchBlob() {
  const name = process.env.ENV_SECRET ?? DEFAULT_SECRET;

  try {
    // 지연 import: SKIP_SECRETS=1 경로에서는 이 패키지가 없어도 동작한다
    const { SecretManagerServiceClient } = await import('@google-cloud/secret-manager');
    const client = new SecretManagerServiceClient();
    const [version] = await client.accessSecretVersion({ name });
    const data = version.payload?.data;
    if (!data) throw new Error('payload 가 비어 있음');
    return typeof data === 'string' ? data : Buffer.from(data).toString('utf8');
  } catch (e) {
    console.error(
      [
        '',
        `Secret Manager 에서 환경변수를 읽지 못했습니다: ${name}`,
        '- gcloud auth application-default login 을 실행했는지 확인하세요.',
        '- 계정에 roles/secretmanager.secretAccessor 권한이 있는지 확인하세요.',
        `원인: ${e?.message ?? e}`,
        '',
      ].join('\n'),
    );
    process.exit(1);
  }
}

// 인자를 배열로 넘기면 shell:true 와 함께 DEP0190 경고가 뜨므로 한 줄로 합쳐 넘긴다.
// (Windows 에서 next/expo 같은 .cmd 실행기를 띄우려면 shell:true 가 필요하다)
const child = spawn([command, ...commandArgs].join(' '), {
  stdio: 'inherit',
  shell: true,
  env,
});
child.on('exit', (code, signal) => process.exit(signal ? 1 : code ?? 1));
child.on('error', (e) => {
  console.error(`명령 실행 실패: ${command}\n${e.message}`);
  process.exit(1);
});

/** dotenv 형식 파서. 새 의존성을 추가하지 않으려고 직접 구현했다. */
function parseEnv(raw) {
  const out = {};

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(trimmed);
    if (!match) continue;

    const [, key] = match;
    let value = match[2].trim();

    const quote = value[0];
    if ((quote === '"' || quote === "'") && value.endsWith(quote) && value.length > 1) {
      value = value.slice(1, -1);
      if (quote === '"') value = value.replace(/\\n/g, '\n');
    } else {
      // 따옴표 없는 값의 인라인 주석 제거
      value = value.replace(/\s+#.*$/, '').trim();
    }

    out[key] = value;
  }

  return out;
}
