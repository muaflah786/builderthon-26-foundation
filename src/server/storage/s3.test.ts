import { describe, expect, it } from "vitest";
import { signV4 } from "@/server/storage/s3";

/**
 * AWS's published SigV4 example "GET Object" (Amazon S3 API Reference,
 * "Signature Calculations for the Authorization Header", example credentials).
 */
describe("signV4", () => {
  it("matches the AWS documentation example", () => {
    const emptyHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    const auth = signV4({
      method: "GET",
      url: new URL("https://examplebucket.s3.amazonaws.com/test.txt"),
      headers: {
        host: "examplebucket.s3.amazonaws.com",
        range: "bytes=0-9",
        "x-amz-content-sha256": emptyHash,
        "x-amz-date": "20130524T000000Z",
      },
      payloadHash: emptyHash,
      accessKeyId: "AKIAIOSFODNN7EXAMPLE",
      secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
      region: "us-east-1",
      amzDate: "20130524T000000Z",
    });
    expect(auth).toBe(
      "AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request, " +
        "SignedHeaders=host;range;x-amz-content-sha256;x-amz-date, " +
        "Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41",
    );
  });
});
