/**
 * Sets the PDF document information dictionary (`/Title`, `/Author`, ...).
 *
 * WHY: Chromium copies `<title>` into `/Title` but has no way to set `/Author`,
 * and the specification requires author "AUTHEON GmbH" (Technical
 * Specifications §3). Rather than pull in a PDF library for two strings, this
 * appends a standards-conformant INCREMENTAL UPDATE: a new revision of the
 * existing `/Info` object, a fresh cross-reference section covering just that
 * object, and a trailer whose `/Prev` chains back to the original one. The
 * original bytes are never rewritten, so the page content, fonts and structure
 * Chromium produced are left completely untouched.
 *
 * This relies on Skia/PDF emitting a CLASSIC cross-reference table, which it
 * does; the function throws rather than guessing if it ever sees anything else.
 */
(function (global) {
  "use strict";

  /** UTF-16BE hex string with BOM — safe for umlauts and any tour identifier. */
  function pdfString(value) {
    const text = String(value == null ? "" : value);
    let hex = "feff";
    for (const ch of text) {
      const cp = ch.codePointAt(0);
      if (cp > 0xffff) {
        const v = cp - 0x10000;
        hex += (0xd800 + (v >> 10)).toString(16).padStart(4, "0");
        hex += (0xdc00 + (v & 0x3ff)).toString(16).padStart(4, "0");
      } else {
        hex += cp.toString(16).padStart(4, "0");
      }
    }
    return `<${hex}>`;
  }

  /**
   * @param {Buffer} pdf     bytes as produced by Chromium
   * @param {object} info    e.g. { Title: "...", Author: "AUTHEON GmbH" }
   * @returns {Buffer}       a new buffer with the updated info dictionary
   */
  function setPdfInfo(pdf, info) {
    const text = pdf.toString("latin1");

    const startxrefAt = text.lastIndexOf("startxref");
    if (startxrefAt < 0) throw new Error("no startxref: not a usable PDF");
    const prevXref = Number(
      (text.slice(startxrefAt).match(/startxref\s+(\d+)/) || [])[1],
    );
    if (!Number.isFinite(prevXref)) throw new Error("unreadable startxref offset");

    const trailerAt = text.lastIndexOf("trailer");
    if (trailerAt < 0 || trailerAt > startxrefAt) {
      throw new Error(
        "no classic trailer found — this PDF uses a cross-reference stream, " +
          "which this incremental-update helper deliberately does not handle",
      );
    }
    const trailer = text.slice(trailerAt, startxrefAt);
    const size = Number((trailer.match(/\/Size\s+(\d+)/) || [])[1]);
    const root = (trailer.match(/\/Root\s+(\d+\s+\d+\s+R)/) || [])[1];
    const infoRef = (trailer.match(/\/Info\s+(\d+)\s+(\d+)\s+R/) || []).slice(1);
    if (!size || !root || infoRef.length !== 2) {
      throw new Error(`trailer is missing /Size, /Root or /Info: ${trailer.trim()}`);
    }
    const [infoNum, infoGen] = infoRef;

    // Carry Chromium's own producer/creator/date entries forward so the update
    // adds information instead of discarding it.
    const existing = {};
    const infoObjAt = text.search(
      new RegExp(`(^|[^0-9])${infoNum}\\s+${infoGen}\\s+obj`, "m"),
    );
    if (infoObjAt >= 0) {
      const body = text.slice(infoObjAt, text.indexOf("endobj", infoObjAt));
      for (const [, key, value] of body.matchAll(
        /\/(Producer|Creator|CreationDate|ModDate)\s*(\([^)]*\)|<[0-9a-fA-F]*>)/g,
      )) {
        existing[key] = value;
      }
    }

    const entries = [];
    for (const [key, value] of Object.entries(info)) {
      if (value == null || value === "") continue;
      entries.push(`/${key} ${pdfString(value)}`);
    }
    for (const [key, raw] of Object.entries(existing)) {
      if (key in info) continue;
      entries.push(`/${key} ${raw}`);
    }

    // The appended section must start on its own line.
    const needsEol = !text.endsWith("\n");
    const prefix = needsEol ? "\n" : "";
    const objOffset = pdf.length + prefix.length;
    const newObj = `${infoNum} ${infoGen} obj\n<<${entries.join(" ")}>>\nendobj\n`;
    const xrefOffset = objOffset + newObj.length;
    const xref =
      `xref\n${infoNum} 1\n${String(objOffset).padStart(10, "0")} ` +
      `${String(infoGen).padStart(5, "0")} n \n`;
    const newTrailer =
      `trailer\n<< /Size ${size} /Root ${root} /Info ${infoNum} ${infoGen} R ` +
      `/Prev ${prevXref} >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

    return Buffer.concat([
      pdf,
      Buffer.from(prefix + newObj + xref + newTrailer, "latin1"),
    ]);
  }

  global.AutheonPdfInfo = { setPdfInfo };
})(typeof window !== "undefined" ? window : globalThis);
