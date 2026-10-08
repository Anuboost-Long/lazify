export interface ScanBatch {
	/** 1-based and inclusive, counted over every analyzable file in path order. */
	start: number;
	end: number;
	total: number;
}
