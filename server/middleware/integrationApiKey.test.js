import assert from "node:assert/strict";
import test from "node:test";
import { requireRfpIntegrationApiKey } from "./integrationApiKey.js";

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
}

test("RFP integration API fails closed and accepts only the configured key", () => {
  const previousKey = process.env.RFP_INTEGRATION_API_KEY;

  try {
    delete process.env.RFP_INTEGRATION_API_KEY;
    const missingConfigResponse = createResponse();
    requireRfpIntegrationApiKey(
      { headers: {} },
      missingConfigResponse,
      () => assert.fail("Unconfigured API must not continue.")
    );
    assert.equal(missingConfigResponse.statusCode, 503);

    process.env.RFP_INTEGRATION_API_KEY = "configured-secret";
    const invalidKeyResponse = createResponse();
    requireRfpIntegrationApiKey(
      { headers: { "x-api-key": "wrong-secret" } },
      invalidKeyResponse,
      () => assert.fail("Invalid API key must not continue.")
    );
    assert.equal(invalidKeyResponse.statusCode, 401);

    const validKeyResponse = createResponse();
    let continued = false;
    requireRfpIntegrationApiKey(
      { headers: { "x-api-key": "configured-secret" } },
      validKeyResponse,
      () => {
        continued = true;
      }
    );
    assert.equal(continued, true);
    assert.equal(validKeyResponse.statusCode, 200);
  } finally {
    if (typeof previousKey === "undefined") {
      delete process.env.RFP_INTEGRATION_API_KEY;
    } else {
      process.env.RFP_INTEGRATION_API_KEY = previousKey;
    }
  }
});
