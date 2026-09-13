# Forgot password

Route: `/forgot-password` | Legacy alias: `/forgotpassword`.

Purpose: start recovery without exposing account existence. Primary action: Send reset link.

Indexing: noindex; exclude from XML sitemap.

SEO title: Reset your password | Crypto Index Asset

Meta description: Request a password reset link for your Crypto Index Asset account.

## Layout

Simplified header → U01 title and explanation → U02 email field and action → status region → return link → compact footer.

Single column around 440px maximum width. Success replaces the form with an email-check explanation and return action. Preserve the page heading so users remain oriented. Mobile uses the same sequence with inset full-width action.

## Page copy

### U01 · Introduction

H1: Reset your password

Enter the email address you used for your account. If it matches an account, we'll send a link to reset your password.

### U02 · Form

Label: Email address

Button: Send reset link

Link: Back to sign in → `/login`

Help link: Need help with account access? Contact support. → `/contact`

## Interface states

| State | Copy |
| --- | --- |
| Missing or invalid email | Enter an email address in the format name@example.com. |
| Submitting | Requesting reset link… |
| Accepted request | Check your email. If this address matches an account, you'll receive a password reset link. |
| Success helper | Check your spam folder too. If you still need help, contact support. |
| Known request failure | We couldn't process your request. Try again or contact support. |
| Confirmed rate limit | Please wait before requesting another link. |
| Uncertain result | We couldn't confirm your request. Check your email before trying again. |

Use the same accepted-request text for known and unknown addresses. Do not show a send countdown without a real server value.

## Publication dependencies

D09 applies. A legacy rendered page is not proof that reset email works. Implement and verify secure recovery before linking here. Add the `/forgotpassword` redirect when this canonical route works. Do not accept credentials or security codes through a support enquiry as a substitute for identity verification.
