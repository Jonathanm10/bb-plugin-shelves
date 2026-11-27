// The suite needs Node 22: better-sqlite3 is built for its ABI, and the jsdom
// tests break on the storage globals of later versions.
const major = process.versions.node.split(".")[0];
if (major !== "22") {
  console.error(
    `Node 22 is required, found ${process.versions.node}. Run: PATH="$(mise where node)/bin:$PATH" npm run check`,
  );
  process.exit(1);
}
