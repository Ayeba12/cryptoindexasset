# Sign in

Route: `/login` | Purpose: help existing users enter their account.

Primary action: Sign in. Indexing: noindex; exclude from XML sitemap.

SEO title: Sign in | Crypto Index Asset

Meta description: Sign in to your Crypto Index Asset account or get help recovering account access.

## Layout

Simplified header → N01 intro → N02 form → recovery and registration links → compact legal footer.

Use a centred reading and form column around 440px maximum width. Email precedes password. Forgot password stays beside or beneath the password label and wraps without overlap. Mobile preserves the same order. Place a submission error above the fields and focus its summary when appropriate.

## Page copy

### N01 · Introduction

H1: Sign in to your account

Enter the email address and password for your Crypto Index Asset account.

### N02 · Form

Label: Email address

Label: Password

Password controls: Show password · Hide password

Recovery link: Forgot password? → `/forgot-password`

Button: Sign in

Registration link: New to Crypto Index Asset? Create account. → `/register`

Help link: Need help signing in? Contact support. → `/contact`

## Interface states

| State | Copy |
| --- | --- |
| Missing email | Enter your email address. |
| Invalid email format | Enter an email address in the format name@example.com. |
| Missing password | Enter your password. |
| Submitting | Signing in… |
| Incorrect credentials | The email or password doesn't match. Try again or reset your password. |
| Confirmed temporary rate limit | There have been too many sign-in attempts. Try again later. |
| Service failure | We couldn't sign you in. Try again or contact support. |
| Session expired | Your session has ended. Sign in to continue. |

Success behaviour: go directly to the authenticated account without a redundant success screen. Preserve a safe intended destination if supported.

## Publication dependencies

D09 applies. Connect recovery and registration destinations. Use a generic credential error that does not reveal whether the email exists. Do not invent a retry countdown without a server time. Do not show a GitHub button or a second-factor success state unless those flows work. The authenticated destination must match the release, not an assumed `/user/dashboard` or `/dashboard` path.
