import { NextRequest, NextResponse } from "next/server";
import { db } from "@white-shop/db";
import { runApiRoute } from "@/lib/errors/run-api-route";
import { logger } from "@/lib/utils/logger";
import { isValidEmail } from "@/lib/utils/email";

/**
 * POST /api/v1/contact
 * Submit contact form
 */
export async function POST(req: NextRequest) {
  return runApiRoute(req, async () => {
    const body = await req.json();
    const { name, email, subject, message } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/validation-error",
          title: "Validation Error",
          status: 400,
          detail: "Field 'name' is required",
          instance: req.url,
        },
        { status: 400 }
      );
    }

    if (!email || typeof email !== "string" || email.trim().length === 0) {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/validation-error",
          title: "Validation Error",
          status: 400,
          detail: "Field 'email' is required",
          instance: req.url,
        },
        { status: 400 }
      );
    }

    if (!subject || typeof subject !== "string" || subject.trim().length === 0) {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/validation-error",
          title: "Validation Error",
          status: 400,
          detail: "Field 'subject' is required",
          instance: req.url,
        },
        { status: 400 }
      );
    }

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/validation-error",
          title: "Validation Error",
          status: 400,
          detail: "Field 'message' is required",
          instance: req.url,
        },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/validation-error",
          title: "Validation Error",
          status: 400,
          detail: "Invalid email format",
          instance: req.url,
        },
        { status: 400 }
      );
    }

    const contactMessage = await db.contactMessage.create({
      data: {
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
      },
    });

    logger.info("Contact message created", { id: contactMessage.id });

    return NextResponse.json(
      {
        data: {
          id: contactMessage.id,
          name: contactMessage.name,
          email: contactMessage.email,
          subject: contactMessage.subject,
          message: contactMessage.message,
          createdAt: contactMessage.createdAt,
        },
      },
      { status: 201 }
    );
  });
}
