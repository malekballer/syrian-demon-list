/**
 * Numbers of decimal digits to round to
 */
const scale = 3;

/**
 * Calculate the score awarded when having a certain percentage on a list level
 * @param {Number} rank Position on the list
 * @param {Number} percent Percentage of completion
 * @param {Number} minPercent Minimum percentage required
 * @param {Number} [totalLevels=100] Current total number of levels on the list
 * @returns {Number}
 */
export function score(rank, percent, minPercent, totalLevels = 100) {
    if (rank > 150) {
        return 0;
    }
    
    // Progress records remain for Top 75 levels
    if (rank > 75 && percent < 100) {
        return 0;
    }

    let maxPoints;
    if (rank <= 20) {
        // Curve from #1 (350) down to ~55 at #20
        maxPoints = 350 * Math.pow(0.9052, rank - 1);
    } else if (rank <= 50) {
        // Curve from #20 (55) down to ~10 at #50
        maxPoints = 55 * Math.pow(0.9385, rank - 20);
    } else {
        // Dynamically decay from #50 (10 pts) down to 1.0 pt at the current lowest rank
        const remainingRanks = Math.max(1, totalLevels - 50);
        const dynamicDecay = Math.pow(1 / 10, 1 / remainingRanks);
        
        maxPoints = 10 * Math.pow(dynamicDecay, rank - 50);
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
