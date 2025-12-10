let pressedKeys = []

export const onKeysPress = ({ keys, pressedKey, cb }) => {
    if (keys[pressedKeys.length]?.toLowerCase() === pressedKey.toLowerCase()) pressedKeys.push(pressedKey)
    if (JSON.stringify(pressedKeys) === JSON.stringify(keys)) {
        pressedKeys = []
        return cb()
    }
}