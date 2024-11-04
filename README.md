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
You can install it from the .crx file in the [releases](https://github.com/Dokkaltek/requests-externalizer/releases) page.

## Development

The extension was made using Angular 15, so you will need to install [angular CLI](https://v15.angular.io/cli) if you didn't have it already, along with any [LTS version of Node](https://v15.angular.io/guide/versions).
As a package manager, [pnpm](https://pnpm.io/installation) was used, so you should use it to manage dependencies.

After that you can start changing files and doing `ng build` to generate the project that you can open from your chromium browser in `chrome://extensions` page 
(You will probably need to enable developer mode to load an unpacked extension).

To package the extension into a .crx file just go to `chrome://extensions` and click the "package extension" button.

## About

This extension was released as-is. If there is anything you think is missing, feel free to open a pull request.
