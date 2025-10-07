# Welcome to the front-end service.

You've landed on the front-end service of the arolariu.ro platform. This service is responsible for serving the front-end of the website, which is built using the [Next.JS v14](https://nextjs.org/) React-based framework.

The front-end service provides a modern and responsive user interface for the arolariu.ro platform. The front-end service is built using TypeScript and integrates with the back-end service to provide a seamless user experience.

## Development

The front-end service is built using the Next.JS framework, which provides a powerful and flexible platform for building modern web applications. The front-end service is written in TypeScript and uses the following technologies:

- **React**: A JavaScript library for building user interfaces.
- **Next.JS**: A React-based framework for building modern web applications.
- **TypeScript**: A statically typed superset of JavaScript that compiles to plain JavaScript.
- **Tailwind CSS**: A utility-first CSS framework for building custom designs.
- **ESLint**: A pluggable JavaScript linter for identifying and fixing problems in your code.
- **Prettier**: An opinionated code formatter that enforces a consistent coding style.
- **PostCSS**: A tool for transforming CSS with JavaScript plugins.
- **PurgeCSS**: A tool for removing unused CSS from your stylesheets.
- **Playwright**: A Node.js library for testing web applications.
- **Docker**: A platform for building, shipping, and running applications in containers.
- **GitHub Actions**: A CI/CD platform for automating the software development lifecycle.
- **Azure App Service**: A platform for hosting web applications in the cloud.
- **Azure CDN**: A content delivery network for delivering web content at scale.
- **Azure Monitor**: A platform for monitoring the performance and availability of web applications.
- **OpenTelemetry**: A set of APIs, libraries, agents, and instrumentation to provide observability for cloud-native software.
- **Azure Application Insights**: A platform for monitoring the performance and availability of web applications.
- **Microsoft Clarity**: A platform for visualizing user behavior on web applications.
- **Google Analytics**: A platform for tracking user interactions on web applications.

etc... please see the `package.json` file for a full list of dependencies. Additionally, the front-end service is integrated with the following services:

- **api.arolariu.ro**: The back-end service provides the API endpoints for the front-end service. The front-end service also acts as a backend-for-frontend (BFF) service, aggregating data from multiple sources and providing a unified API for the client(s).

- **cdn.arolariu.ro**: The content delivery network (CDN) service provides a scalable and reliable platform for delivering web content to users around the world. The CDN service caches static assets and serves them from edge locations close to the user's location.

- **obs.arolariu.ro**: The monitoring service provides real-time monitoring and alerting for the front-end service. The monitoring service collects metrics, logs, and traces from the front-end service and provides insights into the performance and availability of the service.

- **auth.arolariu.ro**: The authentication service provides user authentication and authorization for the front-end service. The authentication service integrates with external identity providers and provides a secure and seamless login experience for users.

<br/>
<br/>
<hr/>
<br/>
<br/>

In order to start the front-end service on your local machine, you need to follow the steps below:

### Step 1. Installing Node.js
To start the front-end service on your local machine, you need to have [Node.js](https://nodejs.org/en/) v20.x+ installed.
You can check if you have Node.js installed by running the following command:

```bash
# Input:
node -v

# Output (example)
v21.6.1
```

If you don't have Node.js installed, you can download it from the official website [here](https://nodejs.org/en/). Please make sure to download the latest LTS version (Version 20+).

### Step 2. Installing Git for Version Control

To clone the repository and start the front-end service, you need to have [Git](https://git-scm.com/) installed on your local machine. You can check if you have Git installed by running the following command:

```bash
# Input:
git --version

# Output (example)
git version 2.33.0
```

If you don't have Git installed, you can download it from the official website [here](https://git-scm.com/).

### Step 3. Cloning the Repository

To clone the repository, run the following command:

```bash
# Input:
git clone https://github.com/arolariu/arolariu.ro.git arolariu.ro

# Output (example)
Cloning into 'arolariu.ro'...
remote: Enumerating objects: 1, done.
remote: Counting objects: 100% (1/1), done.
remote: Total 1 (delta 0), reused 0 (delta 0), pack-reused 0
Receiving objects: 100% (1/1), done.
```

### Step 4. Installing Dependencies

To install the dependencies of the front-end service, navigate to the `sites/arolariu.ro` directory and run the following command:

```bash
# Input:
cd sites/arolariu.ro
npm install

# Output (example)
added 123 packages, and audited 124 packages in 3s

11 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
```


### Step 5. Starting the Development Server

To start the development server, run the following command:

```bash
# Input:
npm run dev

# Output (example)
Using existing cloned repo
  ▲ Next.js 14.2.2 (turbo)
  - Local:        http://localhost:3000
  - Environments: .env
  - Experiments (use with caution):
    · turbo

 ✓ Starting...
```

You can now access the front-end service by navigating to [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

The front-end service is automatically deployed to the production environment when changes are pushed to the `main` branch. The deployment process is managed by the CI/CD pipeline, which builds and deploys the front-end service to the production environment.

The CI/CD pipeline is built using GitHub Actions and is configured to run the following steps:

1. **Build**: The pipeline builds the front-end service using the `npm run build` command.

2. **Test**: The pipeline runs the tests using the `npm run test` command.

3. **Deploy**: The pipeline deploys the front-end service to the production environment.

The deployment process is triggered automatically when changes are pushed to the `main` branch. You can monitor the deployment process in the GitHub Actions tab of the repository.


## Monitoring

The front-end service is monitored using the Azure Monitor platform, which provides real-time monitoring and alerting for the service. The monitoring platform collects metrics, logs, and traces from the front-end service and provides insights into the performance and availability of the service.

The monitoring platform is integrated with the following services:

- **Azure Application Insights**: A platform for monitoring the performance and availability of web applications.

- **Microsoft Clarity**: A platform for visualizing user behavior on web applications.

- **Google Analytics**: A platform for tracking user interactions on web applications.

The monitoring platform provides real-time insights into the performance and availability of the front-end service. 

As an administrator, you can access the monitoring platform by navigating to the following URL:

<div style="background-color: #f0f0f0; padding: 10px; border-radius: 5px; font-size: 16px;">
  <center> <a href="https://obs.arolariu.ro">obs.arolariu.ro</a> </center>
</div>

On the above platform you'll encountered a Grafana dashboard that provides real-time insights into the performance and availability of the front-end service. The dashboard includes metrics such as response time, error rate, and availability, as well as logs and traces from the front-end service.

## E2E Testing

The frontend service includes a Postman collection for end-to-end testing of public pages and health checks.

### Postman Collection

Location: `postman-collection.json`

The collection contains basic health check tests:
- Root page accessibility
- About page accessibility

### Running Tests

#### Using npm script:
```bash
npm run test:e2e:frontend
```

#### Using Newman directly:
```bash
newman run sites/arolariu.ro/postman-collection.json
```

### Collection Variables

The collection uses the following variables:
- `baseUrl`: Constructed as `{{baseProtocol}}://{{baseHost}}`
- `baseHost`: `arolariu.ro` (production) or your local host
- `baseProtocol`: `https` (production) or `http` (local)

**Note**: The collection intentionally omits port numbers for HTTPS (443) and HTTP (80) as these are default ports.

## Support

If you encounter any issues or have any questions, please feel free to reach out to the development team at [admin@arolariu.ro](mailto:admin@arolariu.ro). We are here to help you with any questions or concerns you may have.
