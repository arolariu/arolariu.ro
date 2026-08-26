---
name: backend-vertical-slice
description: Implement or extend an arolariu.ro API endpoint and its required The Standard service path. Use for bounded API behavior that needs endpoint, Processing/Orchestration/Foundation/Broker changes, DI, telemetry, XML docs, and MSTest coverage.
---

# Backend Vertical Slice

## Use When

- Adding or changing bounded API behavior
- Extending an existing service path
- Adding an endpoint whose required lower layers are understood

Do not use to create a bounded context, change auth, or change a data schema
without explicit approval.

## Inputs

- Bounded context
- Route and HTTP behavior
- Request/response contract
- Domain ownership and validation rules

## Procedure

1. Read root and API-local guides, C# and backend instructions, relevant RFCs,
   and one sibling vertical slice.
2. Trace the current endpoint-to-broker path.
3. Identify the highest existing layer that can own the behavior.
4. Write the failing MSTest at that layer.
5. Add only the required lower-layer behavior; do not scaffold unused layers.
6. Keep Brokers logic-free and Foundation services independent.
7. Add the existing TryCatch, Activity, exception, XML-doc, and DI patterns
   where the changed layer requires them.
8. Run the targeted test and smallest API build.

## Completion

List the changed layers and behavior. Report only material architecture drift,
risk, or incomplete validation.

## Stop and Ask

- New dependency
- Authentication/authorization
- Schema/data migration
- New bounded context
- External integration
- Layer direction or dependency-limit change
