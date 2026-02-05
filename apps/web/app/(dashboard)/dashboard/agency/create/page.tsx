"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, notify } from "@propad/ui";
import { getRequiredPublicApiBaseUrl } from "@/lib/api-base-url";

export default function CreateAgencyPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const apiBaseUrl = getRequiredPublicApiBaseUrl();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session?.accessToken) return;
    if (!name.trim()) {
      notify.error("Company name is required");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${apiBaseUrl}/agencies`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || undefined,
          address: address.trim() || undefined,
          registrationNumber: registrationNumber.trim() || undefined,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        notify.error(data?.message || "Failed to create company");
        return;
      }

      notify.success("Company created");
      router.push("/dashboard/agency");
    } catch (error) {
      notify.error("Failed to create company");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Register Company</h1>
        <p className="text-sm text-neutral-500">
          Create your company profile to invite agents and publish listings.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Company details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              placeholder="Company name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <Input
              placeholder="Company phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
            <Input
              placeholder="Company address"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
            />
            <Input
              placeholder="Registration number"
              value={registrationNumber}
              onChange={(event) => setRegistrationNumber(event.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating..." : "Create company"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
