(function () {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  function compressText(text) {
    const encode = getLzwEncode();
    const decode = getLzwDecode();
    if (!encode || !decode) {
      throw new Error("lzw-encoder.js не загружен");
    }

    const binaryText = textToBinaryString(text);
    const encoded = encode(binaryText);
    const decoded = decode(encoded);

    return {
      byteSize: encoder.encode(encoded).length,
      display: encoded,
      roundtripOk: binaryStringToText(decoded) === text,
    };
  }

  function textToBinaryString(text) {
    return Array.from(encoder.encode(text), (byte) => String.fromCharCode(byte)).join("");
  }

  function binaryStringToText(binaryText) {
    if (typeof binaryText !== "string") {
      return String(binaryText ?? "");
    }

    return decoder.decode(Uint8Array.from(binaryText, (char) => char.charCodeAt(0)));
  }

  function getLzwEncode() {
    return window.lzw_encode || globalThis.lzw_encode;
  }

  function getLzwDecode() {
    return window.lzw_decode || globalThis.lzw_decode;
  }

  window.lzwEncoderHelper = {
    compressText,
  };
})();
