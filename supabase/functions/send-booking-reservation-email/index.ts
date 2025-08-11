import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY") || "");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReservationEmailPayload {
  type: "reservation";
  toEmail: string;
  toName?: string;
  tripTitle: string;
  destination?: string;
  dates?: string;
  price?: string; // human readable, e.g. "€3,499"
  reservationDeadlineISO: string; // ISO date string
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKeyPresent = !!Deno.env.get("RESEND_API_KEY");
    if (!apiKeyPresent) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload: ReservationEmailPayload = await req.json();

    if (payload.type !== "reservation") {
      return new Response(JSON.stringify({ error: "Unsupported payload type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const deadline = new Date(payload.reservationDeadlineISO);
    const deadlineStr = deadline.toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" });

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', Arial, sans-serif; color: #111;">
        <h1 style="margin: 0 0 8px;">Reservation Confirmed</h1>
        <p style="margin: 0 0 16px;">Hi ${payload.toName || "traveler"}, your spot is reserved!</p>

        <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px;">
          <h2 style="margin: 0 0 8px;">${payload.tripTitle}</h2>
          ${payload.destination ? `<p style="margin: 0 0 4px;"><strong>Destination:</strong> ${payload.destination}</p>` : ""}
          ${payload.dates ? `<p style="margin: 0 0 4px;"><strong>Dates:</strong> ${payload.dates}</p>` : ""}
          ${payload.price ? `<p style="margin: 0 0 4px;"><strong>Price:</strong> ${payload.price} per person</p>` : ""}
          <p style="margin: 8px 0 0;"><strong>Payment deadline:</strong> ${deadlineStr}</p>
        </div>

        <p style="margin: 16px 0 0;">Please complete your payment by the deadline to secure your booking. You can also choose the €1,000 deposit option and pay the balance later.</p>

        <p style="margin: 16px 0 0; color: #6b7280; font-size: 12px;">If you didn’t make this reservation, please ignore this email.</p>
      </div>
    `;

    const result = await resend.emails.send({
      from: "One More Mile <onboarding@resend.dev>",
      to: [payload.toEmail],
      subject: `Reservation confirmed: ${payload.tripTitle}`,
      html,
    });

    return new Response(JSON.stringify({ success: true, id: (result as any)?.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in send-booking-reservation-email:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
