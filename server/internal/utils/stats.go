package utils

import (
	"math"
	"sort"
)

// Mean returns the average value of a slice.
func Mean(nums []float64) float64 {
	if len(nums) == 0 {
		return 0
	}
	sum := 0.0
	for _, n := range nums {
		sum += n
	}
	return sum / float64(len(nums))
}

// Median returns the middle value of a sorted slice.
func Median(nums []float64) float64 {
	if len(nums) == 0 {
		return 0
	}
	sorted := make([]float64, len(nums))
	copy(sorted, nums)
	sort.Float64s(sorted)
	mid := len(sorted) / 2
	if len(sorted)%2 == 0 {
		return (sorted[mid-1] + sorted[mid]) / 2
	}
	return sorted[mid]
}

// Min returns the smallest number in a slice.
func Min(nums []float64) float64 {
	if len(nums) == 0 {
		return 0
	}
	min := nums[0]
	for _, n := range nums[1:] {
		if n < min {
			min = n
		}
	}
	return min
}

// Max returns the largest number in a slice.
func Max(nums []float64) float64 {
	if len(nums) == 0 {
		return 0
	}
	max := nums[0]
	for _, n := range nums[1:] {
		if n > max {
			max = n
		}
	}
	return max
}

// StdDev returns the standard deviation (population version).
func StdDev(nums []float64) float64 {
	if len(nums) == 0 {
		return 0
	}
	mean := Mean(nums)
	sumSq := 0.0
	for _, n := range nums {
		diff := n - mean
		sumSq += diff * diff
	}
	return math.Sqrt(sumSq / float64(len(nums)))
}
