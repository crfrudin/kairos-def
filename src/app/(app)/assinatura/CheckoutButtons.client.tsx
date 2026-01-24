"use client";

import { Button } from "@/components/ui/button";

type BillingPeriod = "MONTHLY" | "ANNUAL";

type CheckoutApiResponse =
  | { ok: true; url: string }
  | {
      ok: false;
      error:
        | "BILLING_PROFILE_INCOMPLETE"
        | "AUTH_REQUIRED"
        | "FORBIDDEN"
        | "BAD_REQUEST"
        | "SERVER_MISCONFIGURED"
        | "UNEXPECTED";
      debug?: string;
    };

function toNextUrl(path: string, extra?: Record<string, string>): string {
  const next = encodeURIComponent("/assinatura");
  const base = path.replace(/\s+/g, "");
  const params = new URLSearchParams({ next, ...(extra ?? {}) });
  return `${base}?${params.toString()}`;
}

export function CheckoutButtons() {
  async function startCheckout(billingPeriod: BillingPeriod) {
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ billingPeriod }),
      });

      const data = (await res.json().catch(() => null)) as CheckoutApiResponse | null;

      // Gate: cadastro fiscal/administrativo incompleto -> manda para /ajustes
      if (
        res.status === 422 &&
        data &&
        "ok" in data &&
        data.ok === false &&
        data.error === "BILLING_PROFILE_INCOMPLETE"
      ) {
        window.location.href = toNextUrl("/ajustes", { reason: "billing_profile_incomplete" });
        return;
      }

      if (res.status === 401 && data && "ok" in data && data.ok === false && data.error === "AUTH_REQUIRED") {
        window.location.href = toNextUrl("/login");
        return;
      }

      if (!res.ok || !data || !("ok" in data)) {
        window.location.href = "/assinatura?checkout=error";
        return;
      }

      if (data.ok !== true || !data.url) {
        window.location.href = "/assinatura?checkout=error";
        return;
      }

      window.location.href = data.url;
    } catch {
      window.location.href = "/assinatura?checkout=error";
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" onClick={() => void startCheckout("MONTHLY")} aria-label="Assinar plano mensal (Stripe Checkout)">
        Assinar mensal (TEST)
      </Button>

      <Button
        type="button"
        variant="secondary"
        onClick={() => void startCheckout("ANNUAL")}
        aria-label="Assinar plano anual (Stripe Checkout)"
      >
        Assinar anual (TEST)
      </Button>
    </div>
  );
}
