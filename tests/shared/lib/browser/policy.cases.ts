/** Addresses the popup and preview policies are asked about, shared by the Electron recorder and the copy. */
export const SITE_CASES = [
	"https://www.youtube.com/watch?v=1",
	"https://youtube.com/",
	"https://m.youtube.com/feed",
	"https://news.bbc.co.uk/sport",
	"https://bbc.co.uk",
	"https://shop.example.com.kh/cart",
	"https://example.com.kh",
	"https://a.b.c.example.org/x",
	"http://localhost:5173/",
	"http://127.0.0.1:3000/api",
	"https://[::1]:8443/",
	"http://app.localhost:3000/",
	"https://intranet/",
	"about:blank",
	"data:text/html,hi",
	"not a url",
	"",
	"https://WWW.Example.COM/Path",
];

export const CROSS_SITE_PAIRS: Array<[url: string, sourceUrl: string]> = [
	["https://accounts.google.com/o/oauth2", "https://www.google.com/search"],
	["https://accounts.google.com/o/oauth2", "https://news.ycombinator.com/"],
	["https://www.youtube.com/watch", "https://youtube.com/"],
	["https://bet.example-ads.com/", "https://www.youtube.com/watch?v=1"],
	["https://news.bbc.co.uk/", "https://www.bbc.co.uk/"],
	["https://bbc.co.uk/", "https://itv.co.uk/"],
	["about:blank", "https://example.com/"],
	["https://example.com/", ""],
	["http://localhost:3000/", "http://localhost:5173/"],
	["http://127.0.0.1:3000/", "http://localhost:3000/"],
];

export const LOOPBACK_CASES = [
	"http://localhost:5173/",
	"https://localhost/",
	"http://127.0.0.1:3000/x",
	"http://0.0.0.0:8080/",
	"http://[::1]:4000/",
	"http://app.localhost:3000/",
	"http://localhost.example.com/",
	"https://example.com/",
	"ws://localhost:5173/",
	"file:///etc/hosts",
	"about:blank",
	"nonsense",
];

type Policy = {
	siteOf: (url: string) => string;
	isCrossSite: (url: string, sourceUrl: string) => boolean;
	isLoopbackUrl: (url: string) => boolean;
};

export const runPolicyCases = ({ siteOf, isCrossSite, isLoopbackUrl }: Policy) => ({
	siteOf: SITE_CASES.map((url) => [url, siteOf(url)]),
	isCrossSite: CROSS_SITE_PAIRS.map(([url, sourceUrl]) => [url, sourceUrl, isCrossSite(url, sourceUrl)]),
	isLoopbackUrl: LOOPBACK_CASES.map((url) => [url, isLoopbackUrl(url)]),
});
