// NOTE: do NOT add the "nativewind/babel" preset here. With Expo, the
// jsxImportSource option below is all NativeWind needs; the extra preset
// duplicates the JSX/worklets plugins and breaks Hermes bytecode compilation
// (untranspiled private class fields in react-native core).
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }]],
  };
};
