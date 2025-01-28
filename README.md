# Silktide Consent Manager

A free, lightweight and customizable consent manager/cookie banner for websites, designed to help you comply with GDPR and other privacy regulations.

[Learn more](https://silktide.com/consent-manager/) or [Configure it with our wizard](https://silktide.com/consent-manager/install/)

## Features

- **Customizable Design**: Easily customize the appearance of the banner and modal to match your website's design.
- **Multiple Positioning Options**: Choose from different positions for the banner and cookie icon (e.g., bottom-right, bottom-left, center).
- **Granular Cookie Control**: Allow users to accept or reject different types of cookies (e.g., essential, analytics, marketing).
- **Event Callbacks**: Trigger custom JavaScript functions when users accept or reject cookies.
- **Accessibility**: Fully accessible with keyboard navigation and ARIA labels.
- **Responsive Design**: Works seamlessly on all devices, from mobile to desktop.

## Installation

To use the Silktide Consent Manager, include the following files in your project:

1. **JavaScript File**: `silktide-consent-manager.js`
2. **CSS File**: `silktide-consent-manager.css`

You can either download these files and host them yourself.

### Example HTML

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Website</title>
  <link rel="stylesheet" href="path/to/silktide-consent-manager.css">
</head>
<body>
  <script src="path/to/silktide-consent-manager.js"></script>
  <script>
    // Initialize the consent manager with your configuration
    silktideCookieBannerManager.updateCookieBannerConfig({
      cookieTypes: [
        {
          id: 'essential',
          name: 'Essential Cookies',
          description: 'These cookies are necessary for the website to function and cannot be switched off.',
          required: true,
          defaultValue: true,
        },
        {
          id: 'analytics',
          name: 'Analytics Cookies',
          description: 'These cookies help us understand how visitors interact with the website.',
          defaultValue: true,
          onAccept: function() {
            console.log('Analytics cookies accepted');
          },
          onReject: function() {
            console.log('Analytics cookies rejected');
          },
        },
        {
          id: 'marketing',
          name: 'Marketing Cookies',
          description: 'These cookies are used to deliver personalized ads.',
          defaultValue: false,
          onAccept: function() {
            console.log('Marketing cookies accepted');
          },
          onReject: function() {
            console.log('Marketing cookies rejected');
          },
        },
      ],
      text: {
        banner: {
          description: `<p>We use cookies to enhance your experience. By continuing to visit this site, you agree to our use of cookies.</p>`,
          acceptAllButtonText: 'Accept all',
          acceptAllButtonAccessibleLabel: 'Accept all cookies',
          rejectNonEssentialButtonText: 'Reject non-essential',
          rejectNonEssentialButtonAccessibleLabel: 'Reject non-essential',
          preferencesButtonText: 'Preferences',
          preferencesButtonAccessibleLabel: 'Toggle preferences',
        },
        preferences: {
          title: "Customize your cookie preferences",
          description: `<p>We respect your right to privacy. You can choose not to allow some types of cookies. Your cookie preferences will apply across our website.</p>`,
          creditLinkText: 'Get this banner for free',
          creditLinkAccessibleLabel: 'Get this banner for free',
        },
      },
      position: {
        banner: 'bottomRight', // Options: 'bottomRight', 'bottomLeft', 'center', 'bottomCenter'
        cookieIcon: 'bottomLeft', // Options: 'bottomRight', 'bottomLeft'
      },
    });
  </script>
</body>
</html>
```

## Configuration Options

The consent manager can be customized using the following configuration options:

### `cookieTypes`

An array of objects defining the different types of cookies. Each object should include:

- `id`: A unique identifier for the cookie type
- `name`: The name of the cookie type (displayed to the user)
- `description`: A description of the cookie type (displayed to the user)
- `required`: Whether the cookie is essential and cannot be rejected
- `defaultValue`: The default state of the cookie (true for accepted, false for rejected)
- `onAccept`: A callback function triggered when the cookie is accepted
- `onReject`: A callback function triggered when the cookie is rejected

### `text`

An object containing text strings used in the banner and preferences modal:

#### `banner`
- `description`: Main text content for the banner
- `acceptAllButtonText`: Text for the accept all button
- `acceptAllButtonAccessibleLabel`: Accessibility label for accept all button
- `rejectNonEssentialButtonText`: Text for reject button
- `rejectNonEssentialButtonAccessibleLabel`: Accessibility label for reject button
- `preferencesButtonText`: Text for preferences button
- `preferencesButtonAccessibleLabel`: Accessibility label for preferences button

#### `preferences`
- `title`: Title text for the preferences modal
- `description`: Description text for the preferences modal
- `creditLinkText`: Text for the credit link
- `creditLinkAccessibleLabel`: Accessibility label for credit link

### `position`

An object defining the position of the banner and cookie icon:

- `banner`: Position of the banner (options: `bottomRight`, `bottomLeft`, `center`, `bottomCenter`)
- `cookieIcon`: Position of the cookie icon (options: `bottomRight`, `bottomLeft`)

### Callbacks

- `onAcceptAll`: A callback function triggered when the user clicks "Accept All"
- `onRejectAll`: A callback function triggered when the user clicks "Reject Non-Essential"


## Styling
The consent manager comes with a default set of styles, but you can easily customize them by overriding the CSS variables at the top of the `silktide-consent-manager.css` file.

The following variables are scoped to `#silktide-wrapper` to prevent them from being overridden by styles coming from the site the consent manager is used on:

```css
--focus: 0 0 0 2px #ffffff, 0 0 0 4px #000000, 0 0 0 6px #ffffff;
--boxShadow: -5px 5px 10px 0px #00000012, 0px 0px 50px 0px #0000001a;
--fontFamily: Helvetica Neue, Segoe UI, Arial, sans-serif;
--primaryColor: #533BE2; /* Primary color for buttons and links */
--backgroundColor: #FFFFFF; /* Background color for the banner and modal */
--textColor: #253B48; /* Text color */
--backdropBackgroundColor: #00000033; /* Backdrop background color */
--backdropBackgroundBlur: 0px; /* Backdrop blur effect amount */
--cookieIconColor: #533BE2; /* Cookie icon color */
--cookieIconBackgroundColor: #FFFFFF; /* Cookie icon background color */
```

## License
This project is licensed under the [MIT License](./LICENSE).

## Contributing
Contributions are welcome! If you have any suggestions, bug reports, or feature requests, please open an issue or fork this repository and submit a pull request.

Thank you for using the Silktide Consent Manager! We hope it helps you manage cookie consent on your website effectively.
