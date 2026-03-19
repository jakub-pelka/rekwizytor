import { getRadianAngle, rotateSize } from '@/utils/canvasUtils'

describe('Canvas Utilities', () => {
  describe('getRadianAngle', () => {
    it('should convert 0 degrees to 0 radians', () => {
      expect(getRadianAngle(0)).toBe(0)
    })

    it('should convert 90 degrees to π/2 radians', () => {
      const result = getRadianAngle(90)
      expect(result).toBeCloseTo(Math.PI / 2, 10)
    })

    it('should convert 180 degrees to π radians', () => {
      const result = getRadianAngle(180)
      expect(result).toBeCloseTo(Math.PI, 10)
    })

    it('should convert 270 degrees to 3π/2 radians', () => {
      const result = getRadianAngle(270)
      expect(result).toBeCloseTo((3 * Math.PI) / 2, 10)
    })

    it('should convert 360 degrees to 2π radians', () => {
      const result = getRadianAngle(360)
      expect(result).toBeCloseTo(2 * Math.PI, 10)
    })

    it('should handle negative degrees', () => {
      const result = getRadianAngle(-90)
      expect(result).toBeCloseTo(-Math.PI / 2, 10)
    })

    it('should handle decimal degrees', () => {
      const result = getRadianAngle(45.5)
      expect(result).toBeCloseTo((45.5 * Math.PI) / 180, 10)
    })
  })

  describe('rotateSize', () => {
    it('should return same dimensions for 0 degree rotation', () => {
      const result = rotateSize(100, 200, 0)
      expect(result.width).toBeCloseTo(100, 5)
      expect(result.height).toBeCloseTo(200, 5)
    })

    it('should swap dimensions for 90 degree rotation', () => {
      const result = rotateSize(100, 200, 90)
      expect(result.width).toBeCloseTo(200, 5)
      expect(result.height).toBeCloseTo(100, 5)
    })

    it('should return same dimensions for 180 degree rotation', () => {
      const result = rotateSize(100, 200, 180)
      expect(result.width).toBeCloseTo(100, 5)
      expect(result.height).toBeCloseTo(200, 5)
    })

    it('should swap dimensions for 270 degree rotation', () => {
      const result = rotateSize(100, 200, 270)
      expect(result.width).toBeCloseTo(200, 5)
      expect(result.height).toBeCloseTo(100, 5)
    })

    it('should return same dimensions for 360 degree rotation', () => {
      const result = rotateSize(100, 200, 360)
      expect(result.width).toBeCloseTo(100, 5)
      expect(result.height).toBeCloseTo(200, 5)
    })

    it('should calculate diagonal for 45 degree rotation', () => {
      const result = rotateSize(100, 100, 45)
      // 45 degree rotation of a square should give diagonal * sqrt(2)
      const expected = 100 * Math.sqrt(2)
      expect(result.width).toBeCloseTo(expected, 5)
      expect(result.height).toBeCloseTo(expected, 5)
    })

    it('should handle negative rotation angles', () => {
      // -90 degrees should be same as 270 degrees
      const negative = rotateSize(100, 200, -90)
      const positive = rotateSize(100, 200, 270)
      expect(negative.width).toBeCloseTo(positive.width, 5)
      expect(negative.height).toBeCloseTo(positive.height, 5)
    })

    it('should calculate correct bounding box for 30 degree rotation', () => {
      const width = 100
      const height = 200
      const rotation = 30
      const rotRad = (rotation * Math.PI) / 180

      const expectedWidth =
        Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height)
      const expectedHeight =
        Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height)

      const result = rotateSize(width, height, rotation)
      expect(result.width).toBeCloseTo(expectedWidth, 5)
      expect(result.height).toBeCloseTo(expectedHeight, 5)
    })

    it('should handle square dimensions', () => {
      const result = rotateSize(150, 150, 60)
      // For a square, rotated dimensions should be symmetrical
      expect(result.width).toBe(result.height)
    })

    it('should always return positive dimensions', () => {
      const result = rotateSize(100, 200, 123)
      expect(result.width).toBeGreaterThan(0)
      expect(result.height).toBeGreaterThan(0)
    })
  })
})
