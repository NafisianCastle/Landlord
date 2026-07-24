import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function WelcomeCard() {
  return (
    <Card>
      <CardContent className="flex flex-col items-start gap-3 pt-6">
        <h2 className="text-lg font-semibold">Add your first plot</h2>
        <p className="text-sm text-muted-foreground">
          Walk or draw a boundary to see area, value, and location stats here.
        </p>
        <Button asChild>
          <Link href="/plots/new">Add plot</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
