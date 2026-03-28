import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { Screen } from '../../ui/components/Screen';
import { Topbar } from '../../ui/components/Topbar';
import { Card } from '../../ui/components/Card';
import { Button } from '../../ui/components/Button';
import { Input } from '../../ui/components/Input';
import { useAuth } from '../../stores/auth/auth.context';
import { useQuery } from '../../api/hooks/useQuery';
import { api } from '../../api/client';
import { unwrapPayload } from '../../api/mappers/dto';
import { useToast } from '../../ui/components/Toast';
import { toErrorMessage } from '../../core/errors';
import { formatRoleLabel } from '../../core/format';

export function PassengerProfileScreen() {
  const { state, logout } = useAuth();
  const { show } = useToast();
  const profileQuery = useQuery(async () => unwrapPayload<any>(await api.accounts.me()), []);

  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [language, setLanguage] = useState('ru');

  useEffect(() => {
    const profile = profileQuery.data?.profile;
    if (!profile) return;
    setFullName(String(profile.fullName ?? ''));
    setAvatarUrl(String(profile.avatarUrl ?? ''));
    setLanguage(String(profile.language ?? 'ru'));
  }, [profileQuery.data?.profile]);

  return (
    <Screen>
      <Topbar title="Профиль пассажира" />

      <Card>
        <Text style={{ fontWeight: '700' }}>Телефон: {state.user?.phone}</Text>
        <Text>Роль: {formatRoleLabel(state.user?.role)}</Text>
      </Card>

      <Card>
        <Text style={{ fontWeight: '700', fontSize: 16 }}>Редактирование профиля</Text>
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
              await profileQuery.reload();
            } catch (error) {
              show({ title: toErrorMessage(error), tone: 'danger' });
            }
          }}
        />
      </Card>

      <Card>
        <Button title="Выйти" variant="destructive" onPress={() => logout()} />
      </Card>
    </Screen>
  );
}
