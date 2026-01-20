import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function PublicShell(props: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-md" data-testid="public-shell">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl" data-testid="public-shell-title">
            {props.title}
          </CardTitle>
          {props.description ? (
            <CardDescription data-testid="public-shell-description">{props.description}</CardDescription>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4" data-testid="public-shell-content">
          {props.children}
        </CardContent>
      </Card>
    </div>
  );
}
