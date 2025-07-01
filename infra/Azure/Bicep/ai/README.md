# 🤖 AI Module

This module deploys Azure AI services, including Azure AI Foundry, AI Hub, Azure OpenAI, and Computer Vision.

## 📋 Table of Contents

- [🤖 AI Module](#-ai-module)
  - [📋 Table of Contents](#-table-of-contents)
  - [📦 Resources](#-resources)
  - [🚀 Deployment](#-deployment)
  - [🔧 Inputs](#-inputs)
  - [📤 Outputs](#-outputs)

## 📦 Resources

- **Azure OpenAI**: Provides access to OpenAI's language models.
- **Computer Vision**: Offers image analysis capabilities.

## 🚀 Deployment

This module is intended to be deployed from the `facade.bicep` file.

## 🔧 Inputs

| Parameter                  | Type   | Description                           |
| -------------------------- | ------ | ------------------------------------- |
| `resourceDeploymentDate`   | string | The date of the deployment.           |
| `resourceLocation`         | string | The Azure region for the resources.   |
| `resourceConventionPrefix` | string | The prefix for resource names.        |
| `backendManagedIdentity`   | object | The managed identity for the backend. |

## 📤 Outputs

| Output        | Type   | Description                                                              |
| ------------- | ------ | ------------------------------------------------------------------------ |
| `aiResources` | object | An object containing the IDs and endpoints of the deployed AI resources. |
