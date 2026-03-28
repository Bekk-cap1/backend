import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { Screen } from '../../ui/components/Screen';
import { Topbar } from '../../ui/components/Topbar';
import { Card } from '../../ui/components/Card';
import { Input } from '../../ui/components/Input';
import { Button } from '../../ui/components/Button';
import { Badge } from '../../ui/components/Badge';
import { useAuth } from '../../stores/auth/auth.context';
import { useQuery } from '../../api/hooks/useQuery';
import { api } from '../../api/client';
import { unwrapItems, unwrapPayload } from '../../api/mappers/dto';
import { useToast } from '../../ui/components/Toast';
import { toErrorMessage } from '../../core/errors';
import { formatRoleLabel } from '../../core/format';

export function DriverProfileScreen({ navigation }: { navigation: any }) {
  const { state, logout } = useAuth();
  const { show } = useToast();

  const driverProfileQuery = useQuery(async () => unwrapPayload<any>(await api.drivers.me()), []);
  const accountQuery = useQuery(async () => unwrapPayload<any>(await api.accounts.me()), []);
  const vehiclesQuery = useQuery(async () => unwrapItems<any>(await api.vehicles.listMine()), []);

  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [language, setLanguage] = useState('ru');

  useEffect(() => {
    const profile = accountQuery.data?.profile;
    if (!profile) return;
    setFullName(String(profile.fullName ?? ''));
    setAvatarUrl(String(profile.avatarUrl ?? ''));
    setLanguage(String(profile.language ?? 'ru'));
  }, [accountQuery.data?.profile]);

  const driverStatus = String(driverProfileQuery.data?.status ?? 'draft');

  return (
    <Screen>
      <Topbar title="Профиль водителя" />

      <Card>
        <Text style={{ fontWeight: '700' }}>Телефон: {state.user?.phone}</Text>
        <Text>Роль: {formatRoleLabel(state.user?.role)}</Text>
        <Badge label={driverStatus} />
        {driverProfileQuery.data?.rejectionReason ? (
          <Text>Причина отказа: {String(driverProfileQuery.data.rejectionReason)}</Text>
        ) : null}
        <Button
          title="Открыть верификацию"
          variant="secondary"
          onPress={() => navigation.navigate('DriverVerification')}
        />
      </Card>

      <Card>
        <Text style={{ fontWeight: '700' }}>Личные данные</Text>
        <Input label="Полное имя" value={fullName} onChangeText={setFullName} />
        <Input label="Avatar URL" value={avatarUrl} onChangeText={setAvatarUrl} />
        <Input label="Язык (ru/uz/en)" value={language} onChangeText={setLanguage} />
        <Button
          title="Сохранить профиль"
          onPress={async () => {
            try {
              await api.accounts.updateProfile({
                fullName: fullName.trim() || undefined,
                avatarUrl: avatarUrl.trim() || undefined,
                language: language.trim() || undefined,
              });
              show({ title: 'Профиль обновлен', tone: 'success' });
              await accountQuery.reload();
            } catch (error) {
              show({ title: toErrorMessage(error), tone: 'danger' });
            }
          }}
        />
      </Card>

      <Card>
        <Text style={{ fontWeight: '700' }}>Автомобили</Text>
        <Text>Всего: {(vehiclesQuery.data ?? []).length}</Text>
        <Button title="Управлять авто" onPress={() => navigation.navigate('Vehicles')} />
      </Card>

      <Card>
        <Button title="Выйти" variant="destructive" onPress={() => logout()} />
      </Card>
    </Screen>
  );
}
