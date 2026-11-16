import { useEffect, useRef, useState } from 'react';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading, Text } from '@astryxdesign/core/Text';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Link } from '@astryxdesign/core/Link';
import { TextInput } from '@astryxdesign/core/TextInput';

interface WorkshopStatus {
  enabled: boolean;
  loginUrl: string;
  closesAt: string;
}

interface Credentials {
  email: string;
  password: string;
  loginUrl: string;
}

type Availability =
  | { kind: 'loading' }
  | { kind: 'ready'; status: WorkshopStatus }
  | { kind: 'error' };

type Account =
  | { kind: 'idle' }
  | { kind: 'creating' }
  | { kind: 'created'; credentials: Credentials }
  | { kind: 'error'; message: string };

const accountPageUrl = 'https://eneo-anvandartraff.sundsvall.dev/#testkonto';
const storageKey = 'eneo-workshop-request-id';
let memoryRequestId: string | undefined;

function requestIdentity(): { id: string; persisted: boolean } {
  try {
    const existing = sessionStorage.getItem(storageKey);
    const id = existing && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(existing)
      ? existing : memoryRequestId ?? crypto.randomUUID();
    sessionStorage.setItem(storageKey, id);
    memoryRequestId = id;
    return { id, persisted: true };
  } catch {
    memoryRequestId ??= crypto.randomUUID();
    return { id: memoryRequestId, persisted: false };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function isLoginUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    return new URL(value).origin === 'https://eneo-modules.sundsvall.dev';
  } catch {
    return false;
  }
}

function isStatus(value: unknown): value is WorkshopStatus {
  return isRecord(value) && typeof value.enabled === 'boolean' && isLoginUrl(value.loginUrl)
    && typeof value.closesAt === 'string' && Number.isFinite(Date.parse(value.closesAt));
}

function isCredentials(value: unknown): value is Credentials {
  return isRecord(value) && typeof value.email === 'string' && value.email.length > 0
    && typeof value.password === 'string' && value.password.length > 0 && isLoginUrl(value.loginUrl);
}

export function WorkshopAccounts() {
  const [availability, setAvailability] = useState<Availability>({ kind: 'loading' });
  const [account, setAccount] = useState<Account>({ kind: 'idle' });
  const [identity] = useState(requestIdentity);
  const [code, setCode] = useState('');
  const [copyMessage, setCopyMessage] = useState('');
  const inFlight = useRef(false);

  async function loadStatus() {
    setAvailability({ kind: 'loading' });
    try {
      const response = await fetch('/api/workshop/status', { cache: 'no-store', signal: AbortSignal.timeout(20_000) });
      const value: unknown = await response.json();
      if (!response.ok || !isStatus(value)) throw new Error('Invalid workshop status');
      setAvailability({ kind: 'ready', status: value });
    } catch {
      setAvailability({ kind: 'error' });
    }
  }

  useEffect(() => { void loadStatus(); }, []);

  async function createAccount() {
    if (inFlight.current || account.kind === 'created' || !code.trim()
      || availability.kind !== 'ready') return;
    inFlight.current = true;
    setAccount({ kind: 'creating' });
    try {
      const response = await fetch('/api/workshop/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim(), requestId: identity.id }),
        cache: 'no-store',
        signal: AbortSignal.timeout(20_000),
      });
      const value: unknown = await response.json();
      if (!response.ok) {
        const message = isRecord(value) && typeof value.error === 'string'
          ? value.error : 'Kontot kunde inte skapas. Försök igen eller be en handledare om hjälp.';
        setAccount({ kind: 'error', message });
        return;
      }
      if (!isCredentials(value)) throw new Error('Invalid account response');
      setAccount({ kind: 'created', credentials: value });
      setCode('');
    } catch {
      setAccount({ kind: 'error', message: 'Vi fick inget svar. Försök igen på den här sidan för att hämta samma konto, utan att skapa ett till.' });
    } finally {
      inFlight.current = false;
    }
  }

  async function copyCredentials() {
    if (account.kind !== 'created') return;
    const { email, password, loginUrl } = account.credentials;
    try {
      await navigator.clipboard.writeText(`Eneo testkonto\nE-post: ${email}\nLösenord: ${password}\nLogga in: ${loginUrl}`);
      setCopyMessage('Inloggningsuppgifterna är kopierade.');
    } catch {
      setCopyMessage('Det gick inte att kopiera automatiskt. Markera och kopiera uppgifterna i fälten ovan.');
    }
  }

  const status = availability.kind === 'ready' ? availability.status : undefined;
  const creating = account.kind === 'creating';

  return <VStack gap={8}>
    <VStack gap={4} maxWidth="72ch">
      <Heading level={1} id="page-title" textWrap="balance">Ditt testkonto till det praktiska passet</Heading>
      <Text as="p" type="large" color="secondary">Skapa ett eget konto i Eneos testmiljö och börja prova din idé. Du får träffkoden av handledaren.</Text>
    </VStack>
    <Grid columns={{ minWidth: 280, max: 2 }} gap={8}>
      <VStack gap={5} maxWidth="72ch">
        {availability.kind === 'loading' && <Text as="p" role="status">Kontrollerar att kontoskapandet är öppet…</Text>}
        {availability.kind === 'error' && <>
          <Banner status="error" role="alert" title="Det gick inte att nå kontotjänsten" description="Försök igen eller be en handledare om hjälp." />
          <Button label="Försök igen" onClick={() => { void loadStatus(); }} />
        </>}
        {status && !status.enabled && <Banner status="info" title="Kontoskapandet är stängt" description="Du kan fortfarande hämta ett konto som redan skapats i samma flik. Ange träffkoden nedan. Be en handledare om hjälp om du behöver ett nytt konto." />}
        {status && account.kind !== 'created' && <>
          <TextInput label="Träffkod" value={code} onChange={setCode} type="password" autoComplete="off"
            description="Ange koden som handledaren visar på träffen." isRequired isDisabled={creating}
            onEnter={() => { void createAccount(); }} width="100%" />
          {account.kind === 'error' && <Banner status="error" role="alert" title="Kontot kunde inte hämtas" description={account.message} />}
          <Button label={!status.enabled ? 'Hämta mitt konto' : account.kind === 'error' ? 'Försök igen' : 'Skapa testkonto'} variant="primary" size="lg"
            isLoading={creating} isDisabled={!code.trim()} onClick={() => { void createAccount(); }} />
          {creating && <Text as="p" role="status">{status.enabled ? 'Skapar eller hämtar ditt konto.' : 'Hämtar ditt konto.'} Stanna kvar på sidan tills du får dina uppgifter.</Text>}
          {status.enabled && <Text as="p" type="supporting">Kontoskapandet är öppet till {new Intl.DateTimeFormat('sv-SE', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Stockholm' }).format(new Date(status.closesAt))}.</Text>}
        </>}
        {!identity.persisted && <Banner status="warning" title="Webbläsaren kan inte komma ihåg ditt konto" description="Stanna kvar på sidan och kopiera uppgifterna innan du laddar om eller lämnar den." />}
        {account.kind === 'created' && <VStack gap={5}>
          <Banner status="success" role="status" title="Ditt testkonto är klart" description="Kopiera uppgifterna innan du öppnar Eneo. Använd kontot till övningarna under träffen." />
          <Text as="p">Första gången du loggar in ber Eneo dig att välja ett eget lösenord. Därefter använder du ditt nya lösenord.</Text>
          <TextInput label="E-post för inloggning" value={account.credentials.email} isReadOnly autoComplete="off" width="100%" />
          <TextInput label="Lösenord" value={account.credentials.password} isReadOnly autoComplete="off" width="100%" />
          <HStack gap={3} wrap="wrap">
            <Button label="Kopiera inloggningsuppgifter" onClick={() => { void copyCredentials(); }} />
            <Button label="Öppna Eneo" href={account.credentials.loginUrl} target="_blank" rel="noopener noreferrer" variant="primary" />
          </HStack>
          {copyMessage && <Text as="p" role="status">{copyMessage}</Text>}
          <Text as="p" type="supporting">Uppgifterna sparas inte i webbläsaren. Behöver du hämta dem igen i samma flik, ange träffkoden på nytt.</Text>
        </VStack>}
      </VStack>
      <VStack gap={4}>
        <Heading level={2}>Öppna sidan på en annan enhet</Heading>
        <Text as="p">Skanna QR-koden för att öppna kontosidan på din telefon eller dator. Samma träffkod gäller.</Text>
        <Link href={accountPageUrl} aria-label="Öppna sidan för testkonton">
          <img src="/workshop-account-qr.svg" alt="QR-kod till sidan för testkonton" width={256} height={256}
            style={{ width: '16rem', maxWidth: '100%', height: 'auto', display: 'block' }} />
        </Link>
        <Link href={accountPageUrl} hasUnderline isStandalone>Öppna sidan för testkonton</Link>
      </VStack>
    </Grid>
  </VStack>;
}
