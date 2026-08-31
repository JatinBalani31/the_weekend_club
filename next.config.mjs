/** @type {import('next').NextConfig} */
const nextConfig = {
	images: {
		// Admins pick banner image URLs themselves (trusted content, not arbitrary user input),
		// so any https host is allowed rather than maintaining a per-host allowlist.
		remotePatterns: [{ protocol: "https", hostname: "**" }],
	},
};

export default nextConfig;
