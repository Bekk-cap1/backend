import { FlatList, Text, View } from 'react-native';
import { Badge } from '../Badge';
import { Card } from '../Card';
import { useTheme } from '../../theme/ThemeProvider';

export type LadderEntry = {
  id: string;
  side: 'passenger' | 'driver';
  price: number;
  seats: number;
  status: string;
  optimistic?: boolean;
};

export function NegotiationLadder({
  title,
  turn,
  status,
  entries,
}: {
  title: string;
  turn: 'passenger' | 'driver' | null;
  status: string;
  entries: LadderEntry[];
}) {
  const { theme } = useTheme();

  return (
    <View style={{ gap: 10 }}>
      <Card>
        <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 16 }}>{title}</Text>
        <Text style={{ color: theme.colors.muted }}>
          {turn ? (turn === 'passenger' ? 'Passenger turn' : 'Driver turn') : 'Turn sync in progress'}
        </Text>
        <Badge label={status} />
      </Card>

      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 8 }}
        renderItem={({ item }) => (
          <Card
            style={{
              borderColor: item.side === 'driver' ? 'rgba(251,113,133,0.5)' : 'rgba(34,211,238,0.5)',
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: theme.colors.text, fontWeight: '700' }}>
                {item.side === 'driver' ? 'Driver move' : 'Passenger move'}
              </Text>
              <Badge label={item.optimistic ? 'syncing' : item.status} />
            </View>
            <Text style={{ color: theme.colors.text }}>Price: {item.price.toLocaleString('en-US')} UZS</Text>
            <Text style={{ color: theme.colors.muted }}>Seats: {item.seats}</Text>
          </Card>
        )}
      />
    </View>
  );
}
