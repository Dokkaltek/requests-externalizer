# Requests externalizer
<div align="center">
  <img src="https://github.com/user-attachments/assets/426d0782-f3d5-462c-b266-411876378e45" alt="Logo">
</div>

This is a browser extension to send GET requests to any third party program.
The extension captures requests for each page you visit and allows you to send them or parts of the request links to any external application:

![Extension popup](https://github.com/user-attachments/assets/03804d2d-c19d-4a6a-81e2-11cf2cbbc51f)

To send these requests you can configure the applications to send the selected requests to:

![Program selection](https://github.com/user-attachments/assets/62aab806-19e2-45e2-94f8-8b9d7c206b14)

## Installation
You can install it unpackaged from the zip in the [releases](https://github.com/Dokkaltek/requests-externalizer/releases) page.

Alternatively you can build it from scratch downloading the master branch, installing packages with `pnpm install` and then build it using angular cli with `ng build`. The resulting "dist" folder that will be created is the extension that can be used on the browsers.

For Chrome/chromium browsers you will have to remove the `scripts`, `key` and `browser_specific_settings` keys from the manifest before sending the extension to upload to any store:

``` JSON
"background": {
    "scripts": ["assets/background.js"]
},
"browser_specific_settings": {
  "gecko": {
    "id": "requests-externalizer@dokkaltek.es",
    "strict_min_version": "109.0"
  } 
},
"key": "MIIBIjANBgkqhki ... "
```

For Firefox you need to remove the `service_worker` and the `key` keys from the manifest:

``` JSON
"background": {
    "service_worker": "assets/background.js"
},
"key": "MIIBIjANBgkqhki ... "
```

## Development

The extension was made using Angular 15, so you will need to install [angular CLI](https://v15.angular.io/cli) if you didn't have it already, along with any [LTS version of Node](https://v15.angular.io/guide/versions).
As a package manager, [pnpm](https://pnpm.io/installation) was used, so you should use it to manage dependencies.

After that you can start changing files and doing `ng build` to generate the project that you can open from your chromium browser in `chrome://extensions` page 
(You will probably need to enable developer mode to load an unpacked extension).

To package the extension into a .crx file just go to `chrome://extensions` and click the "package extension" button.

## About

This extension was released as-is. If there is anything you think is missing, feel free to open a pull request.
