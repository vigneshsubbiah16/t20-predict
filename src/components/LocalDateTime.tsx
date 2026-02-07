"use client";

import { useEffect, useState } from "react";

interface LocalDateTimeProps {
  dateString: string;
  format?: "short" | "long" | "date-only";
}

function formatDate(dateString: string, format: LocalDateTimeProps["format"]): string {
  const date = new Date(dateString);

  switch (format) {
    case "long":
      return `${date.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })} at ${date.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    case "date-only":
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
    default:
      return date.toLocaleDateString();
  }
}

export function LocalDateTime({ dateString, format = "short" }: LocalDateTimeProps) {
  const [formatted, setFormatted] = useState("");

  useEffect(() => {
    setFormatted(formatDate(dateString, format));
  }, [dateString, format]);

  // Render empty until client-side effect runs to avoid hydration mismatch.
  // suppressHydrationWarning handles the empty-to-formatted transition.
  return <span suppressHydrationWarning>{formatted}</span>;
}
