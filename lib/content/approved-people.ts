import people from "../../content/approved-people.json";

export type ApprovedTrader = (typeof people.traders)[number];
export type ApprovedTestimonial = (typeof people.testimonials)[number];

/** Operator-approved profiles, in their approved publication order. */
export const APPROVED_TRADERS: readonly ApprovedTrader[] = people.traders;

/** Operator-approved testimonial copy, in its approved publication order. */
export const APPROVED_TESTIMONIALS: readonly ApprovedTestimonial[] =
  people.testimonials;

export const APPROVED_CONTENT_DATE = "2026-09-12";
