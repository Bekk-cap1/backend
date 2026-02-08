import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

export function KpiCard({
  title,
  value,
  delta,
}: {
  title: string;
  value: string | number;
  delta?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold">{value}</div>
        {delta ? <p className="mt-2 text-xs text-muted-foreground">{delta}</p> : null}
      </CardContent>
    </Card>
  );
}
