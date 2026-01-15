import * as http from "http";
import { URL } from "url";

/**
 * Tries to treat the given input as something JSON-encoded. If this
 * is true, the corresponding JSON-object is returned. Otherwise the
 * string is returned unchanged.
 */
function tryParseJson(input: string): string | object {
  try {
    return JSON.parse(input);
  } catch {
    return input;
  }
}

/**
 * Executes an HTTP-request.
 *
 * @param url The URL to call
 * @param method The HTTP verb to use
 * @param body Will be JSON-serialized and sent
 */
export function httpRequest<T>(
  url: URL,
  method: "GET" | "POST" | "PUT",
  body: any = ""
) {
  const p = new Promise<T>((resolve, reject) => {
    // Build the complicated request options object
    // This is basicly the same as the URL + required headers + the method
    const options: http.RequestOptions = {
      method: method,
      hostname: url.hostname,
      port: url.port,
      protocol: url.protocol,
      path: url.pathname,
      headers: {
        "Content-Type": "application/json",
      },
    };

    const buffer =
      body instanceof Buffer ? body : Buffer.from(JSON.stringify(body), "utf8");
    options.headers["Content-Length"] = buffer.byteLength;

    // Build the request object
    const request = http.request(options, (response) => {
      // temporary data holder
      const responseBody = [];

      // on every content chunk, push it to the data array
      response.on("data", (chunk) => {
        responseBody.push(chunk);
      });

      // We are done, resolve promise with those joined chunks
      response.on("end", () => {
        const result = tryParseJson(responseBody.join(""));

        if (response.statusCode < 200 || response.statusCode > 299) {
          reject({
            statusCode: response.statusCode,
            message: result,
          });
        } else {
          resolve(result as any);
        }
      });
    });

    // handle connection errors of the request
    request.on("error", (err) =>
      reject(`ERROR ${method}: ${url.toString()}\n${JSON.stringify(err)}`)
    );

    // Pump data into the request (if its a POST request)
    if (buffer.length > 0) {
      request.write(buffer);
    }

    // console.error(
    //   `${method}: ${url.toString()} (${buffer.length} byte request body)`
    // );

    // And hit off the request for good
    request.end();
  });

  return p;
}
