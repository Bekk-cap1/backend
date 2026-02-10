import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Screen } from '../../ui/components/Screen';
import { Topbar } from '../../ui/components/Topbar';
import { Card } from '../../ui/components/Card';
import { Button } from '../../ui/components/Button';
import { Input } from '../../ui/components/Input';
import { useQuery } from '../../api/hooks/useQuery';
import { api } from '../../api/client';
import { unwrapPayload } from '../../api/mappers/dto';
import { useToast } from '../../ui/components/Toast';
import { toErrorMessage } from '../../core/errors';

export function DriverVerificationScreen() {
  const { show } = useToast();
  const query = useQuery(async () => unwrapPayload<any>(await api.drivers.me()), []);

  const [fullName, setFullName] = useState('');
  const [licenseNo, setLicenseNo] = useState('');
  const [passportNo, setPassportNo] = useState('');
  const [licenseFrontUrl, setLicenseFrontUrl] = useState('');
  const [passportFrontUrl, setPassportFrontUrl] = useState('');
  const [selfieUrl, setSelfieUrl] = useState('');
  const [busy, setBusy] = useState(false);

  const status = String(query.data?.status ?? 'draft').toLowerCase();
  const rejectionReason = query.data?.rejectionReason
    ? String(query.data.rejectionReason)
    : null;

  const statusLabel = useMemo(() => {
    if (status === 'verified') return 'Verified';
    if (status === 'pending') return 'Pending moderation';
    if (status === 'rejected') return 'Rejected';
    return 'Draft';
  }, [status]);

  const submitDisabled =
    busy ||
    status === 'pending' ||
    !fullName.trim() ||
    !licenseNo.trim() ||
    !passportNo.trim() ||
    !licenseFrontUrl.trim() ||
    !passportFrontUrl.trim();

  const handleSubmit = async () => {
    setBusy(true);
    try {
      await api.drivers.upsertProfile({
        fullName: fullName.trim(),
        licenseNo: licenseNo.trim(),
        passportNo: passportNo.trim(),
      });

      await api.drivers.submitVerification({
        docs: {
          licenseFrontUrl: licenseFrontUrl.trim(),
          passportFrontUrl: passportFrontUrl.trim(),
          selfieUrl: selfieUrl.trim() || undefined,
        },
      });

      show({ title: 'Application submitted for moderation.', tone: 'success' });
      await query.reload();
    } catch (error) {
      show({ title: toErrorMessage(error), tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Topbar title="Become a driver" />
      <Card>
        <Text style={{ fontWeight: '700' }}>KYC status: {statusLabel}</Text>
        {rejectionReason ? <Text>Rejection reason: {rejectionReason}</Text> : null}
        <Text>Driver features unlock only after moderator verification.</Text>
      </Card>

      <Card>
        <Text style={{ fontWeight: '700' }}>Step 1: Personal details</Text>
        <Input label="Full name" value={fullName} onChangeText={setFullName} placeholder="John Doe" />
        <Input label="License number" value={licenseNo} onChangeText={setLicenseNo} placeholder="AB123456" />
        <Input label="Passport number" value={passportNo} onChangeText={setPassportNo} placeholder="AA1234567" />
      </Card>

      <Card>
        <Text style={{ fontWeight: '700' }}>Step 2: Document links</Text>
        <Input
          label="License front URL"
          value={licenseFrontUrl}
          onChangeText={setLicenseFrontUrl}
          placeholder="https://..."
        />
        <Input
          label="Passport front URL"
          value={passportFrontUrl}
          onChangeText={setPassportFrontUrl}
          placeholder="https://..."
        />
        <Input
          label="Selfie URL (optional)"
          value={selfieUrl}
          onChangeText={setSelfieUrl}
          placeholder="https://..."
        />

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button
            title="Generate upload URL"
            variant="secondary"
            onPress={async () => {
              try {
                const res = await api.storage.presign({
                  purpose: 'driver_doc',
                  contentType: 'image/jpeg',
                  fileName: 'driver-doc.jpg',
                });
                const data = unwrapPayload<any>(res);
                if (typeof data.publicUrl === 'string') {
                  setLicenseFrontUrl((prev) => prev || data.publicUrl);
                  show({ title: 'Upload URL generated. Put resulting file URL into fields.', tone: 'info' });
                }
              } catch (error) {
                show({ title: toErrorMessage(error), tone: 'danger' });
              }
            }}
          />
        </View>
      </Card>

      <Card>
        <Text style={{ fontWeight: '700' }}>Step 3: Submit</Text>
        <Button
          title={status === 'pending' ? 'Application pending' : 'Submit for verification'}
          loading={busy}
          disabled={submitDisabled}
          onPress={handleSubmit}
        />
      </Card>
    </Screen>
  );
}
