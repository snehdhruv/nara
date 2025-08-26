# Integration Tests

Integration tests that test multiple components working together.

## Files

- `test-complete-pipeline.ts` - End-to-end pipeline tests
- `test-convex-integration.ts` - Tests for Convex database integration
- `test-real-validation.ts` - Real-world validation tests
- `test-integration.js` - Legacy integration tests
- `test-integration.ts` - TypeScript integration tests

## Running

```bash
npm run test:integration
```

## Prerequisites

- Convex database should be running
- External services may need to be available
- Environment variables should be properly configured

## Notes

- These tests may take longer to run than unit tests
- They test the interaction between multiple components
- May require external dependencies and services
