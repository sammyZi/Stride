import { InteractionManager, UIManager, Platform } from 'react-native';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

// Configure for maximum performance
export const configurePerformance = () => {
    // Set maximum frame rate
    if (Platform.OS === 'android') {
        // Android-specific optimizations
        InteractionManager.setDeadline(16.67); // 60 FPS baseline
    }
};

/**
 * Shallow comparison for React.memo / shouldComponentUpdate
 * Much faster than JSON.stringify — O(keys) vs O(tree)
 */
export const shallowEqual = (objA: any, objB: any): boolean => {
    if (Object.is(objA, objB)) return true;
    if (typeof objA !== 'object' || objA === null || typeof objB !== 'object' || objB === null) {
        return false;
    }

    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);

    if (keysA.length !== keysB.length) return false;

    for (let i = 0; i < keysA.length; i++) {
        if (!Object.prototype.hasOwnProperty.call(objB, keysA[i]) || !Object.is(objA[keysA[i]], objB[keysA[i]])) {
            return false;
        }
    }
    return true;
};

export default {
    configurePerformance,
    shallowEqual,
};
