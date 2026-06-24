import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart' as geo;
import '../models/attendance_model.dart';

class LocationService {
  static final LocationService _instance = LocationService._internal();
  factory LocationService() => _instance;
  LocationService._internal();

  /// Check if location services are enabled and permissions granted
  Future<LocationPermissionStatus> checkPermission() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      return LocationPermissionStatus.serviceDisabled;
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        return LocationPermissionStatus.denied;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      return LocationPermissionStatus.deniedForever;
    }

    return LocationPermissionStatus.granted;
  }

  /// Get current position with high accuracy
  Future<Position?> getCurrentPosition() async {
    try {
      final status = await checkPermission();
      if (status != LocationPermissionStatus.granted) {
        return null;
      }

      return await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 15),
      );
    } catch (e) {
      return null;
    }
  }

  /// Get last known position (faster, less accurate)
  Future<Position?> getLastKnownPosition() async {
    try {
      return await Geolocator.getLastKnownPosition();
    } catch (e) {
      return null;
    }
  }

  /// Stream of position updates
  Stream<Position> getPositionStream() {
    return Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 10, // meters
      ),
    );
  }

  /// Reverse geocode: coordinates to address
  Future<String?> getAddressFromCoordinates(double latitude, double longitude) async {
    try {
      final placemarks = await geo.placemarkFromCoordinates(latitude, longitude);
      if (placemarks.isEmpty) return null;

      final placemark = placemarks.first;
      final parts = <String>[];

      if (placemark.street != null && placemark.street!.isNotEmpty) {
        parts.add(placemark.street!);
      }
      if (placemark.subLocality != null && placemark.subLocality!.isNotEmpty) {
        parts.add(placemark.subLocality!);
      }
      if (placemark.locality != null && placemark.locality!.isNotEmpty) {
        parts.add(placemark.locality!);
      }
      if (placemark.country != null && placemark.country!.isNotEmpty) {
        parts.add(placemark.country!);
      }

      return parts.isEmpty ? 'Unknown Location' : parts.join(', ');
    } catch (e) {
      return null;
    }
  }

  /// Calculate distance between two points in meters
  double calculateDistance(
    double startLat,
    double startLng,
    double endLat,
    double endLng,
  ) {
    return Geolocator.distanceBetween(startLat, startLng, endLat, endLng);
  }

  /// Get location data with address
  Future<LocationData> getLocationData() async {
    final position = await getCurrentPosition();
    if (position == null) {
      return LocationData(latitude: 0, longitude: 0, address: 'Location unavailable');
    }

    final address = await getAddressFromCoordinates(
      position.latitude,
      position.longitude,
    );

    return LocationData(
      latitude: position.latitude,
      longitude: position.longitude,
      address: address ?? '${position.latitude.toStringAsFixed(4)}, ${position.longitude.toStringAsFixed(4)}',
    );
  }

  /// Open device location settings
  Future<bool> openLocationSettings() async {
    return await Geolocator.openLocationSettings();
  }

  /// Open app settings for permission
  Future<bool> openAppSettings() async {
    return await Geolocator.openAppSettings();
  }
}

enum LocationPermissionStatus {
  granted,
  denied,
  deniedForever,
  serviceDisabled,
}