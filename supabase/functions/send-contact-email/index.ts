import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://ce31f3af-8b91-484e-98ed-813aa571c1cc.sandbox.lovable.dev, https://qvirgcrbnwcyhbqdazjy.supabase.co",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ContactFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Contact form submission received");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const formData: ContactFormData = await req.json();
    console.log("Form data received:", { 
      firstName: formData.firstName, 
      lastName: formData.lastName, 
      email: formData.email,
      subject: formData.subject 
    });

    // Validate required fields
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.subject || !formData.message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    // Send email to the company
    const companyEmailResponse = await resend.emails.send({
      from: "Contact Form <onboarding@resend.dev>",
      to: ["kenny_hermans93@hotmail.com"], // Your email
      subject: `New Contact Form: ${sanitizedData.subject}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>From:</strong> ${sanitizedData.firstName} ${sanitizedData.lastName}</p>
        <p><strong>Email:</strong> ${sanitizedData.email}</p>
        ${sanitizedData.phone ? `<p><strong>Phone:</strong> ${sanitizedData.phone}</p>` : ''}
        <p><strong>Subject:</strong> ${sanitizedData.subject}</p>
        
        <h3>Message:</h3>
        <p style="white-space: pre-wrap;">${sanitizedData.message}</p>
        
        <hr>
        <p style="color: #666; font-size: 12px;">
          This message was sent from the One More Mile contact form.
        </p>
      `,
    });

    console.log("Company email sent:", companyEmailResponse);

    // Send confirmation email to the user
    const userEmailResponse = await resend.emails.send({
      from: "One More Mile <onboarding@resend.dev>",
      to: [sanitizedData.email],
      subject: "We received your message!",
      html: `
        <h1>Thank you for contacting us, ${sanitizedData.firstName}!</h1>
        <p>We have received your message about "<strong>${sanitizedData.subject}</strong>" and will get back to you within 24 hours.</p>
        
        <h3>Your message:</h3>
        <p style="background: #f5f5f5; padding: 15px; border-radius: 5px; white-space: pre-wrap;">${sanitizedData.message}</p>
        
        <p>Best regards,<br>
        The One More Mile Team</p>
        
        <hr>
        <p style="color: #666; font-size: 12px;">
          If you have any urgent questions, you can reach us at adventures@onemoremile.com or +1 (555) 123-MILE.
        </p>
      `,
    });

    console.log("User confirmation email sent:", userEmailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Message sent successfully!" 
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-contact-email function:", error);
    return new Response(
      JSON.stringify({ 
        error: "Failed to send message. Please try again.", 
        details: error.message 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);