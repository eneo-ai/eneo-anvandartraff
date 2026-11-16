import { Button } from '@astryxdesign/core/Button';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Heading, Text } from '@astryxdesign/core/Text';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Link } from '@astryxdesign/core/Link';
import { List, ListItem } from '@astryxdesign/core/List';
import { eneoSkill } from './content';

export function EneoSkill() {
  return <VStack gap={5} maxWidth="72ch">
    <Heading level={2} id="eneo-skill">{eneoSkill.title}</Heading>
    <Text as="p">{eneoSkill.description}</Text>
    <VStack gap={3}>
      <Heading level={3}>Kom igång</Heading>
      <Text as="p">Klistra in den här uppmaningen i din kodagent. Den hämtar skillen och guidar dig till en API-nyckel.</Text>
      <CodeBlock code={eneoSkill.startPrompt} language="text" hasLanguageLabel={false} isWrapped width="100%" />
    </VStack>
    <HStack gap={3} wrap="wrap">
      <Button href={eneoSkill.downloadHref} label="Ladda ner skillen (zip)" />
      <Link href={eneoSkill.guideHref} hasUnderline isStandalone>Läs skillens instruktioner</Link>
    </HStack>
    <Text as="p" type="supporting">{eneoSkill.manualInstall}</Text>
    <List header={<Heading level={3}>Prova sedan att be om</Heading>} hasDividers density="spacious" edge="flush">
      {eneoSkill.examples.map(example => <ListItem key={example} label={<Text>{example}</Text>} />)}
    </List>
    <Text as="p" type="supporting">{eneoSkill.caveat}</Text>
  </VStack>;
}
