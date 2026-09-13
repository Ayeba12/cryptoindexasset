# Reset password

Route: `/reset-password`, reached through a valid recovery link.

Purpose: complete recovery. Primary action: Save new password.

Indexing: noindex; exclude from XML sitemap. Do not put token-bearing URLs in navigation or analytics.

SEO title: Choose a new password | Crypto Index Asset

Meta description: Choose a new password to restore access to your Crypto Index Asset account.

## Layout

Simplified header → token validation state → B01 intro → B02 password fields → action → compact footer.

Single column around 440px maximum width. An invalid link replaces the form with the recovery action. On success replace fields with confirmation and Sign in. Preserve order on mobile. Never show a password in a success message.

## Page copy

### B01 · Introduction

H1: Choose a new password

Use a unique password for your Crypto Index Asset account.

### B02 · Form

Label: New password

Label: Confirm new password

Helper: Enter the same password in both fields.

Password controls: Show password · Hide password

Button: Save new password

## Interface states

| State | Copy and action |
| --- | --- |
| Checking link | Checking reset link… |
| Missing password | Enter a new password. |
| Rule mismatch | Your password must meet the requirements shown above. |
| Confirmation mismatch | The passwords don't match. Enter the same password in both fields. |
| Saving | Saving password… |
| Confirmed success | Your password has been changed. Sign in with your new password. Action: Sign in → `/login` |
| Expired, invalid or used link | This reset link is no longer valid. Request a new link to continue. Action: Request new link → `/forgot-password` |
| Confirmed failure | We couldn't change your password. Try again or request a new reset link. |
| Uncertain result | We couldn't confirm the password change. Try signing in, or request a new reset link. |

## Publication dependencies

D09 applies. Show actual password requirements supplied by the server. Confirm single-use recovery behaviour and the handling of existing sessions. Do not claim that all devices have been signed out unless the backend has done it. This page is a new proposed flow, not currently verified functionality.
