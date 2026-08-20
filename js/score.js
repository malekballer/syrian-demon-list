/**
 * Numbers of decimal digits to round to
 */
const scale = 3;

/**
 * Calculate the score awarded when having a certain percentage on a list level
 * @param {Number} rank Position on the list
 * @param {Number} percent Percentage of completion
 * @param {Number} minPercent Minimum percentage required
 * @returns {Number}
 */
export function score(rank, percent, minPercent) {
    // Reverted back to original rank 150 limit
    if (rank > 150) {
        return 0;
    }
    
    // Progress records remain for Top 75 levels
    if (rank > 75 && percent < 100) {
        return 0;
    }

    // Determine 100% completion points based on your benchmarks:
    // #1 (Trickshot) = 500, #17 (Sonic Wave) = 50, #48 (Bloodbath) = 7, #99 (Acu) = 1.5
    let maxPoints;
    if (rank <= 20) {
        // Curve from #1 (500) to #17 (50)
        maxPoints = 350 * Math.pow(0.8952, rank - 1);
    } else if (rank <= 50) {
        // Curve from #17 (50) to #48 (7)
        maxPoints = 50 * Math.pow(0.9385, rank - 20);
    } else {
        // Curve from #48 (7) down through the rest of the list
        maxPoints = 10 * Math.pow(0.9696, rank - 50);
    }

    // Scale points by percentage completion
    let score = maxPoints * ((percent - (minPercent - 1)) / (100 - (minPercent - 1)));

    score = Math.max(0, score);

    // Apply standard progress penalty (1/3 point reduction) for non-100% runs
    if (percent != 100) {
        return round(score - score / 3);
    }

    return Math.max(round(score), 0);
}

export function round(num) {
    if (!('' + num).includes('e')) {
        return +(Math.round(num + 'e+' + scale) + 'e-' + scale);
    } else {
        var arr = ('' + num).split('e');
        var sig = '';
        if (+arr[1] + scale > 0) {
            sig = '+';
        }
        return +(
            Math.round(+arr[0] + 'e' + sig + (+arr[1] + scale)) +
            'e-' +
            scale
        );
    }
}
