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

/** UTC fallback that is safe to render on the server (no locale-dependent output). */
function formatDateUTC(dateString: string, format: LocalDateTimeProps["format"]): string {
  const date = new Date(dateString);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[date.getUTCMonth()];
  const day = date.getUTCDate();

  switch (format) {
    case "long": {
      const year = date.getUTCFullYear();
      const h = String(date.getUTCHours()).padStart(2, "0");
      const m = String(date.getUTCMinutes()).padStart(2, "0");
      return `${month} ${day}, ${year} at ${h}:${m} UTC`;
    }
    case "date-only":
      return `${month} ${day}`;
    default:
      return `${month} ${day}, ${date.getUTCFullYear()}`;
  }
}

export function LocalDateTime({ dateString, format = "short" }: LocalDateTimeProps) {
  const [formatted, setFormatted] = useState(() => formatDateUTC(dateString, format));

  useEffect(() => {
    setFormatted(formatDate(dateString, format));
  }, [dateString, format]);

  return <span suppressHydrationWarning>{formatted}</span>;
}
