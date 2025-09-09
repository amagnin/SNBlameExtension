# SN Blame

**SN Blame** is a utility browser extension for [ServiceNow](https://www.servicenow.com/) developers.  
It adds powerful static analysis and code intelligence features to ServiceNow instances, including:

- **Blame View:** Displays who wrote each line of code in scripts (similar to `git blame`).
- **Script Include IntelliSense:** Automatically loads script include definitions for better code intelligence.
- **Static Analysis Modals:**  
  - For tables like **Business Rules**, **SP Widgets**, **Script Includes**, etc.  
  - Shows GlideRecord calls, arguments, referenced tables, and used Script Includes.  
  - Displays properties of Script Includes:
    - Functions (with arguments)
    - Literals (values, if statically resolvable)
    - Arrays and objects (expanded when possible)
  - Provides other helpful metadata for the selected table or script.  

The goal of SN Blame is to give ServiceNow developers deep visibility into their codebase directly in the browser.

---

## Tech Stack

- **JavaScript** (no framework)
- **Webpack** for bundling
- **SCSS** for styling
- **Jasmine** for testing (unit + integration)
- **Selenium** for integration tests
- **JSDoc** for code documentation

---

## Installation (Development Setup)

1. **Clone the repository:**
```bash
   git clone https://github.com/amagnin/SNBlameExtension.git
   cd SNBlameExtension
```

2. **Install dependencies:**
```bash
   npm install
```

3. **Build the extension:**
```bash
   npm run build
```

4. **Load the extension:**
### Chrome
- Go to `chrome://extensions/`
- Enable **Developer Mode**
- Click **Load unpacked** and select the `dist/` directory

### Firefox
- Go to `about:debugging#/runtime/this-firefox`
- Click **Load Temporary Add-on**
- Select any file inside the `dist/` directory


## Scripts

| Script             |Description                                                                                     |
|--------------------|------------------------------------------------------------------------------------------------|
| `npm run build`    | Builds the extension in production mode (development environment).                             |
| `npm test`         | Runs **unit tests** and **integration tests** (requires `.env` file, see below).               |
| `npm run doc`      | Generates documentation with **JSDoc** and formats HTML docs with **Prettier**.                |
| `npm run dist`     | Builds the extension and creates a `.zip` for publishing to the Chrome Web Store.              |

## Testing

Integration tests require a `.env` file in the project root with these values:
PDI_URL=https://your-instance.service-now.com
PDI_USER=admin
PDI_PASSWORD=your_password

**Run tests with:**
```bash
  npm run test
```

## Documentation

Generate documentation with:
```bash
   npm run doc
```

The documentation will be output in the docs/ directory.
Make sure to add JSDoc comments to classes, singletons, functions, constants, and interfaces to keep the documentation comprehensive.

## Publishing

To prepare a release zip for publishing on the Chrome Web Store:
```bash
   npm run dist 
```

This command:
1. Runs the production build.
2. Bundles the extension into a `.zip` file for submission.

## License

This project is licensed under the **GPL-3.0 License**. See the [LICENSE](LICENSE) file for details