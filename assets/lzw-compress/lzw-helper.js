(function () {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  function compressText(text) {
    const lzwCompress = getLzwCompress();
    if (!lzwCompress) {
      throw new Error("lzwCompress.js не загружен");
    }

    const binaryText = textToBinaryString(text);
    const codes = lzwCompress.pack(binaryText);
    if (!Array.isArray(codes)) {
      return {
        byteSize: new TextEncoder().encode(String(codes ?? "")).length,
        display: String(codes ?? ""),
        roundtripOk: binaryStringToText(lzwCompress.unpack(codes)) === text,
      };
    }

    return {
      byteSize: Math.ceil(estimateBitLength(codes) / 8),
      display: codes.join(","),
      roundtripOk: binaryStringToText(lzwCompress.unpack(codes)) === text,
    };
  }

  function estimateBitLength(codes) {
    let dictionarySize = 256;
    let bitLength = 0;

    codes.forEach((code, index) => {
      bitLength += Math.max(8, Math.ceil(Math.log2(dictionarySize + 1)));
      if (index < codes.length - 1) {
        dictionarySize += 1;
      }
    });

    return bitLength;
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

  function getLzwCompress() {
    return window.lzwCompress || globalThis.lzwCompress;
  }

  window.lzwCompressionHelper = {
    compressText,
  };
})();
