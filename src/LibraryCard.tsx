import { ClickableCard } from '@astryxdesign/core/ClickableCard';
import { Heading, Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/Stack';

interface LibraryCardProps {
  title: string;
  description: string;
  cover: string;
  href: string;
  detail?: string;
}

export function LibraryCard({ title, description, cover, href, detail }: LibraryCardProps) {
  return <ClickableCard padding={0} href={href} label={`Öppna ${title}`}>
    <img src={cover} alt="" width={1200} height={675} decoding="async"
      style={{ width: '100%', height: 'auto', aspectRatio: '16 / 9', objectFit: 'cover', display: 'block' }} />
    <VStack gap={3} padding={5}>
      <Heading level={2}>{title}</Heading>
      <Text color="secondary">{description}</Text>
      {detail && <Text type="supporting">{detail}</Text>}
    </VStack>
  </ClickableCard>;
}
