# User Flows

This document details the navigation flows for key actions in the VendorIQ platform.

## 1. Registration Flow
1. **User** visits `/register`.
2. **System** displays registration form (Email, Password, Confirm Password).
3. **User** submits form.
4. **System** calls `POST /auth/register`.
5. **System** displays success message and redirects to `/login`.

## 2. Login Flow
1. **User** visits `/login`.
2. **System** displays login form (Email, Password).
3. **User** submits credentials.
4. **System** calls `POST /auth/login`.
5. **System** receives JWT `access_token` and stores it in `localStorage`.
6. **System** redirects to the appropriate dashboard based on user role (fetched via `GET /auth/me`).

## 3. Forgot / Reset Password Flow
1. **User** clicks "Forgot Password?" on the login page.
2. **System** navigates to `/forgot-password`.
3. **User** enters email address and clicks "Send Link".
4. **System** calls `POST /auth/forgot-password`.
5. **User** receives an email with a reset link containing a token.
6. **User** clicks link, navigating to `/reset-password?token=XYZ`.
7. **System** displays reset password form (New Password).
8. **User** submits new password.
9. **System** calls `POST /auth/reset-password` and redirects to `/login`.

## 4. Dashboard Entry (Role-Based)
After successful login, the system directs the user based on their role:
- **Administrator**: Directed to main Overview Dashboard `/dashboard`. Full access to all modules.
- **Procurement Manager**: Directed to Procurement Dashboard `/procurement`. Focuses on Purchase Orders and Vendors.
- **Supply Chain Manager**: Directed to Vendors Dashboard `/vendors`. Focuses on Vendor Performance and Reliability.
- **Finance Officer**: Directed to Contracts Dashboard `/contracts`. Focuses on financial compliance.
- **Vendor**: Directed to Vendor Portal `/vendor-portal`. Focuses on their specific Purchase Orders and Profile.
- **Auditor**: Directed to Reports Dashboard `/reports`. Read-only access to compliance and historical data.
