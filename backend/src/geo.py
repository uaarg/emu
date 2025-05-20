"""
Functions for basic GPS coordinate processing.
Covers:
    - Converting UTM coordinates sent by the GPS to Decimal Degree coords (lat/lon).
    - Georeferencing features in an image.
    - Calculating properties of a series of points (ex. length, area)
"""

from math import radians, degrees, sqrt, tan, sin, cos, atan, atan2
from statistics import mean
import copy

import pyproj
from shapely.geometry import Polygon

geod = pyproj.Geod(ellps="WGS84")  # WGS84 is the datum used by GPS


class Position:
    """
    Position in 3D space of an object relative to the earth.
    Latitude and longitude are for the WGS84 datum.
    """

    def __init__(self, lat, lon, height=0, alt=None):
        """
        lat - latitude in degrees
        lon - longitude in degrees
        height - height above ground in meters
        alt - altitude above sea level in meters
        """
        self.lat = lat
        self.lon = lon
        self.height = height
        self.alt = alt

    def __str__(self):
        output = "(%.6f, %.6f)" % (self.lat, self.lon)

        if self.height != 0:
            output += " height=%.0f" % self.height

        if self.alt is not None:
            output += " alt=%.0f" % self.alt

        return output

    def __copy__(self):
        return Position(self.lat, self.lon, self.height, self.alt)

    def copy(self):
        return self.__copy__()

    def __eq__(self, other):
        # Won't be equal if the other object doesn't have the required attributes.
        return (hasattr(other, "lat") and hasattr(other, "lon")
                and hasattr(other, "height") and hasattr(other, "alt")
                and self.lat == other.lat and self.lon == other.lon
                and self.height == other.height and self.alt == other.alt)

    def latLon(self):
        return (self.lat, self.lon)

    def dispHeight(self):
        """
        Returns the height in a format suitable for display.
        """
        return "%.0f m" % int(self.height)

    def dispLatLon(self):
        """
        Returns the latitude and longitude in a format suitable for
        display.
        """
        return "%.6f, %.6f" % (self.lat, self.lon)

    def dispLatLonDDMMSS(self):
        """
        Returns the Latitude and Longitude in DD:MM:SS form for US 2016 competition
        """

        if (self.lat > 0):
            latHemisphere = "N"
        else:
            latHemisphere = "S"

        latDD = int(abs(self.lat))
        latMM = 60 * (abs(self.lat) - latDD)
        latSS = 60 * (latMM - int(latMM))

        latDD = str("%02.0f" % latDD)
        latMM = str("%02.0f" % latMM)
        latSS = str("%02.3f" % latSS)

        latDDMMSS = latHemisphere + latDD + " " + latMM + " " + latSS

        if (self.lon > 0):
            lonHemisphere = "E"
        else:
            lonHemisphere = "W"

        lonDD = int(abs(self.lon))
        lonMM = 60 * (abs(self.lon) - lonDD)
        lonSS = 60 * (lonMM - int(lonMM))

        lonDD = str("%03.0f" % lonDD)
        lonMM = str("%02.0f" % lonMM)
        lonSS = str("%02.3f" % lonSS)

        lonDDMMSS = lonHemisphere + lonDD + " " + lonMM + " " + lonSS

        return [latDDMMSS, lonDDMMSS]


class Orientation:
    """
    Orientation of an object with respect to the earth.
    """

    def __init__(self, pitch, roll, yaw):
        """
        pitch - angle of the nose above the horizontal plane (theta)
                in degrees
        roll - angle of the left wing above the horizontal plane (phi)
                in degrees
        yaw - angle of the nose from true north along the horizontal (psi)
                plane measured clockwise in degrees
        """

        def normalize_angle(angle, mininum=-180, maximum=180):
            original_angle = angle
            i = 0
            while angle >= maximum:
                i += 1
                angle -= 360
                if i > 10:
                    raise ValueError(
                        "Failed to normalize provided angle of {} : it's way out of range"
                        .format(original_angle))
            while angle < mininum:
                i += 1
                angle += 360
                if i > 10:
                    raise ValueError(
                        "Failed to normalize provided angle of {} : it's way out of range"
                        .format(original_angle))
            return angle

        self.pitch = normalize_angle(pitch)
        self.roll = normalize_angle(roll)
        self.yaw = normalize_angle(yaw, 0, 360)

        self.pitch_rad = radians(self.pitch)
        self.roll_rad = radians(self.roll)
        self.yaw_rad = radians(self.yaw)

    def __str__(self):
        return "pitch: %s\N{DEGREE SIGN}, roll: %s\N{DEGREE SIGN}, yaw: %s\N{DEGREE SIGN}" % (
            self.pitch, self.roll, self.yaw)

    def dispPitch(self):
        """
        Returns the pitch in a format suitable for display.
        """
        return "%s\N{DEGREE SIGN}" % int(self.pitch)

    def dispRoll(self):
        """
        Returns the roll in a format suitable for display.
        """
        return "%s\N{DEGREE SIGN}" % int(self.roll)

    def dispYaw(self):
        """
        Returns the yaw in a format suitable for display.
        """
        return "%s\N{DEGREE SIGN}" % int(self.yaw)


class CameraSpecs:
    """
    Camera constants needed for geo-referencing.
    """

    def __init__(self, image_width, image_height, field_of_view_horiz,
                 field_of_view_vert):
        """
        image_width - the horizontal size of the image in pixels.
        image_height - the vertical size of the image in pixels.
        field_of_view_horiz - the angle between the camera and
                the left and right edges of the image. In degrees.
        field_of_view_vert - the angle between the camera and
                the top and bottom edges of the image. In degrees.
        """
        self.image_width = image_width
        self.image_height = image_height

        self.field_of_view_horiz = field_of_view_horiz
        self.field_of_view_vert = field_of_view_vert

        self.field_of_view_horiz_rad = radians(self.field_of_view_horiz)
        self.field_of_view_vert_rad = radians(self.field_of_view_vert)

        # Used repeatedly in calculations so pre-calculating result for speed
        self.tan_angle_div_2_horiz = tan(self.field_of_view_horiz_rad / 2)
        self.tan_angle_div_2_vert = tan(self.field_of_view_vert_rad / 2)

    def __str__(self):
        return "%s by %s with %s\N{DEGREE SIGN} by %s\N{DEGREE SIGN}" % (
            self.image_width, self.image_height, self.field_of_view_horiz,
            self.field_of_view_vert)


class GeoReference:
    """
    Class for geo-referencing. Create an instance with the relatively
    contstant variables of the system. Then use the methods to perform
    the desired type of geo-referencing.
    """

    def __init__(self, camera_specs):
        """
        Create an instance according to the specified system constants.
        """
        self.camera = camera_specs

    def centerOfImage(self, location, orientation):
        """
        Calculates and returns the position of the centre of the image.
        The plane location and orientation at the time
        the image was taken should be provided
        as Location and Orientation objects.
        """
        return self.pointInImage(location, orientation,
                                 self.camera.image_width / 2,
                                 self.camera.image_height / 2)

    def pointInImage(self, location, orientation, pixel_x, pixel_y):
        """
        Calculates and returns the position of the point located at
        pixel_x, pixel_y in the image. The plane location and
        orientation at the time the image was taken should be provided
        as Location and Orientation objects.

        location - plane location
        orientation - plane orientation
        pixel_x - pixel in the image at the point. Measured from left
                edge. Should be the same dimension as the image_width.
        pixel_y - pixel in the image at the point. Measured from bottom
                edge. Should be the same dimension as the image_height.

        Returns None if the point is determined to not be on the ground.
        Ex. if a point in the sky was clicked. This can happen if the
        effective pitch or roll is greater than 90 degrees.

        Algorithm described here:
        sftp://uaargarchive@142.244.63.77/Upload/Ground Station Imaging/Geo-referencing Calculations
        https://drive.google.com/a/ualberta.ca/folderview?id=0BxmxpOgS5RpSbU1pWHN5dlBTelk&usp=sharing
        """

        if location.height <= 0:
            return None  # Can't geo-reference if the plane isn't above the ground

        camera = self.camera

        # Step 1: calculating angle offsets of pixel selected
        delta_theta_horiz = atan((1 - 2 * pixel_x / camera.image_width) *
                                 camera.tan_angle_div_2_horiz)
        delta_theta_vert = atan((1 - 2 * pixel_y / camera.image_height) *
                                camera.tan_angle_div_2_vert)

        # Step 2: calculating effective pitch and roll
        pitch = orientation.pitch_rad + delta_theta_vert
        roll = orientation.roll_rad + delta_theta_horiz

        positive_90 = radians(90)
        negative_90 = -positive_90

        if pitch >= positive_90 or pitch <= negative_90 or roll >= positive_90 or roll <= negative_90:
            return None  # Point is in the sky

        # Step 3: calculating level distance and angle to pixel
        distance_y = location.height * tan(pitch)
        distance_x = location.height * tan(-roll)
        distance = sqrt(distance_x * distance_x + distance_y * distance_y)
        phi = atan2(distance_x, distance_y
                    )  # atan2 used to provide angle properly for any quadrant

        # Step 4: calculating angle from north to pixel
        forward_azimuth = phi + orientation.yaw_rad

        # Step 5: calculating endpoint using pyproj GIS module
        pixel_lon, pixel_lat, back_azimuth = geod.fwd(location.lon,
                                                      location.lat,
                                                      degrees(forward_azimuth),
                                                      distance)

        # print("pointInImage - distance: %.1f, bearing: %.1f, result: %.6f, %.6f" % (distance,
        #                                                                             degrees(forward_azimuth),
        #                                                                             pixel_lat,
        #                                                                             pixel_lon))

        return Position(pixel_lat, pixel_lon)

    def pointBelowPlane(self, plane_location, orientation):
        """
        Calculates and returns the position (pixel_x and pixel_y) of
        the location on the earth directly below the plane.
        """
        point_location = copy.copy(plane_location)
        point_location.height = 0
        return self.pointOnImage(plane_location, orientation, point_location)

    def pointOnImage(self, plane_location, orientation, point_location):
        """
        Calculates and returns the position (pixel_x and pixel_y) in the
        image of the point at the specified location. The plane location
        and orientation at the time the image was taken should be
        provided as Location and Orientation objects.

        Returns a tuple of two None's if the point is determiend to not be
        in the image.

        The point's location doesn't have to be on the earth: objects
        above the ground can be located in the image too.

        If the point's height is None, it's taken to be 0: on the earth.
        If the point's height is 0 (or None), then this function is the
        inverse of pointInImage().
        """

        if plane_location.height <= 0:
            return None, None  # Can't geo-reference if the plane isn't above the ground

        camera = self.camera

        forward_azimuth, back_azimuth, distance = geod.inv(
            plane_location.lon, plane_location.lat, point_location.lon,
            point_location.lat)
        forward_azimuth = radians(forward_azimuth)
        back_azimuth = radians(back_azimuth)

        phi = forward_azimuth - orientation.yaw_rad

        distance_x = distance * sin(phi)
        distance_y = distance * cos(phi)

        pitch = atan2(distance_y,
                      plane_location.height - (point_location.height or 0))
        roll = -atan2(distance_x, plane_location.height -
                      (point_location.height or 0))

        delta_theta_vert = pitch - orientation.pitch_rad
        delta_theta_horiz = roll - orientation.roll_rad

        pixel_x = (1 - tan(delta_theta_horiz) /
                   camera.tan_angle_div_2_horiz) * camera.image_width / 2
        pixel_y = (1 - tan(delta_theta_vert) /
                   camera.tan_angle_div_2_vert) * camera.image_height / 2

        # print("Internal pixel_x, pixel_y: %s, %s" % (pixel_x, pixel_y))
        if pixel_x < 0 or pixel_x >= camera.image_width or pixel_y < 0 or pixel_y >= camera.image_height:
            return None, None

        return pixel_x, pixel_y


class PositionCollection:

    def __init__(self, positions, interior_positions_list=None):
        """
        Class for calculating properties of an ordered series of positions.

        A list of interior positions can be provided to define
        holes in the polygon for area calculations or to be included in
        the perimeter for perimeter calculations. Note that this is a
        list of lists of positions unlike the positions argument which
        is just a list of positions.
        """
        self.positions = positions
        self.interior_positions_list = interior_positions_list

    def center(self):
        """
        Calculates the centroid of the positions.

        Inspired by https://gist.github.com/amites/3718961
        """
        if not self.positions:
            return None
        elif len(self.positions) == 1:
            return self.positions[0]
        else:
            x = 0
            y = 0
            z = 0
            height = 0
            alt = 0

            for position in self.positions:
                lat = radians(position.lat)
                lon = radians(position.lon)
                x += cos(lat) * cos(lon)
                y += cos(lat) * sin(lon)
                z += sin(lat)

                if not position.height:
                    height = None
                else:
                    if height is not None:
                        height += position.height

                if not position.alt:
                    alt = None
                else:
                    if alt is not None:
                        alt += position.alt

            x = float(x / len(self.positions))
            y = float(y / len(self.positions))
            z = float(z / len(self.positions))

            lat = degrees(atan2(z, sqrt(x * x + y * y)))
            lon = degrees(atan2(y, x))

            if height:
                height = height / len(self.positions)
            if alt:
                alt = alt / len(self.positions)

            return Position(lat, lon, height, alt)

    def area(self):
        """
        Calculates the area of the polygon defined by the sequence of
        positions (and optional holes defined by interior_positions_list).
        """
        if len(self.positions) < 4:
            return 0

        positions = self.getPerimeterPositions(close=True)
        lat, lon = zip(*[position.latLon() for position in positions])

        # Defining an equal area projection around the location of interest. aea stands for Albers equal-area
        projection = pyproj.Proj(proj="aea",
                                 lat_1=min(lat),
                                 lat_2=max(lat),
                                 lat_0=mean(lat),
                                 lon_0=mean(lon))

        def positions_to_coords(positions):
            # Converting to a list of latitudes and a list of longitudes since this is what pyproj expects
            lat, lon = zip(*[position.latLon() for position in positions])
            x, y = projection(lon, lat)  # Projection the lat/lon into x/y
            coords = list(zip(x, y))
            return coords

        # Converting the outside of the polygon:
        coords = positions_to_coords(positions)

        # Now doing the same for the interiors, if any:
        if self.interior_positions_list:
            interior_coords_list = []
            for interior_positions in self.interior_positions_list:
                interior_coords_list.append(
                    positions_to_coords(interior_positions))
        else:
            interior_coords_list = None

        # Creating the planar shape and getting its area
        polygon = Polygon(coords, interior_coords_list)
        if not polygon.is_valid:
            raise ValueError("Positions do not define a valid polygon.")
        return polygon.area

    def _segment_length(self, positions, include_height, include_alt):
        """
        For internal use to keep things DRY.

        If include_height or include_alt is specified, factors in the
        vertical change between positions as part of the length.
        """
        if include_height and include_alt:
            raise ValueError(
                "Both include_height and include_alt specified. Must pick only one or neither."
            )

        length = 0
        for i, position in enumerate(positions):
            if i == 0:
                continue
            position1 = positions[i - 1]
            position2 = positions[i]
            lat1, lon1 = position1.latLon()
            lat2, lon2 = position2.latLon()
            forward_azimuth, back_azimuth, distance = geod.inv(
                lon1, lat1, lon2, lat2)

            if include_height:
                try:
                    delta_height = abs(position1.height - position2.height)
                except TypeError:
                    raise ValueError(
                        "Valid height values must be provided for all positions when specifying include_height."
                    )
                distance = sqrt(distance * distance +
                                delta_height * delta_height)

            if include_alt:
                try:
                    delta_alt = abs(position1.alt - position2.alt)
                except TypeError:
                    raise ValueError(
                        "Valid alt values must be provided for all positions when specifying include_alt."
                    )

                distance = sqrt(distance * distance + delta_alt * delta_alt)

            length += distance
        return length

    def getPerimeterPositions(self, close=True):
        """
        Returns the list of positions that describe the perimter. If
        close is true, the last position will always be the same as
        the first.
        """
        if close and self.positions[0] != self.positions[-1]:
            positions = self.positions + [self.positions[0]]
        else:
            positions = self.positions
        return positions

    def perimeter(self, include_height=False, include_alt=False):
        """
        Returns the length around the outside of the polygon plus the
        length around each hole (if interior_positions provided).
        Connects the last point to the first point if not already
        explicitely done.

        Specify include_height or include_alt to include height
        or altitude changes in the distance calculations (otherwise
        treats all positions as if on the surface of the earth).
        """
        positions = self.getPerimeterPositions()

        length = 0

        if self.interior_positions_list:
            segments = [positions] + self.interior_positions_list
        else:
            segments = [positions]

        for segment in segments:
            length += self._segment_length(segment,
                                           include_height=include_height,
                                           include_alt=include_alt)
        return length

    def length(self, include_height=False, include_alt=False):
        """
        Returns the length along the provided points. Does not connect
        the last to the first automatically.

        Specify include_height or include_alt to include height
        or altitude changes in the distance calculations (otherwise
        treats all positions as if on the surface of the earth).
        """
        return self._segment_length(self.positions,
                                    include_height=include_height,
                                    include_alt=include_alt)

    def boundingBox(self, include_rotation=False):
        north = max([position.lat for position in self.positions])
        south = min([position.lat for position in self.positions])
        east = max([position.lon for position in self.positions])
        west = min([position.lon for position in self.positions])
        return (north, south, east, west)


def utm_to_DD(easting, northing, zone, hemisphere="northern"):
    """
    Converts a set of UTM GPS coordinates to WGS84 Decimal Degree GPS coordinates.
    Returns (latitude, longitude) as a tuple.
    easting - UTM easting in metres
    northing - UTM northing in metres
    zone - current UTM zone

    Note that no hemisphere is specified; in the southern hemisphere, this function expects the
    false northing (10 000 000m) to be subtracted.

    An exception will be raised if the conversion involves invalid values.
    """

    easting, northing, zone = float(easting), float(northing), int(zone)
    # Easting and Northing ranges from http://geokov.com/education/utm.aspx (used to be:
    # https://www.e-education.psu.edu/natureofgeoinfo/c2_p23.html)
    min_easting, max_easting = 166000, 834000
    if not (min_easting < easting < max_easting):
        raise ValueError("Easting value of %s is out of bounds (%s to %s)." %
                         (easting, min_easting, max_easting))
    min_northing, max_northing = -9900000, 9400000
    if not (min_northing < northing < max_northing):
        raise ValueError("Northing value of %s is out of bounds (%s to %s)." %
                         (northing, min_northing, max_northing))

    if not (1 <= zone <= 60):
        raise ValueError("Zone value of %s is out of bounds" % zone)

    pr = pyproj.Proj(proj='utm', zone=zone, ellps='WGS84', errcheck=True)

    lon, lat = pr(easting, northing, inverse=True)
    return lat, lon


def position_at_offset(position, distance, angle):
    """
    Calculates the position of a point a certain distance and angle
    away from the given position.

    distance - the distance of the new point away from the given position, in m.
    angle - the forward azimuth angle from the given point to the new point,
    in degrees.

    Returns a new Position object.
    """
    lon, lat, back_azimuth = geod.fwd(position.lon, position.lat, angle,
                                      distance)
    return Position(lat, lon)


def heading_between_positions(position_a, position_b):
    """
    Calculates the heading from position_a to position_b.

    position_a, position_b - Position objects.
    Returns a positive angle in degrees from 0 to 360 clockwise from north.
    """

    (az_ab, az_ba, dist) = geod.inv(position_a.lon, position_a.lat,
                                    position_b.lon, position_b.lat)

    def normalize_angle(angle, mininum=0, maximum=360):
        original_angle = angle
        i = 0
        while angle >= maximum:
            i += 1
            angle -= 360
            if i > 10:
                raise ValueError(
                    "Failed to normalize provided angle of {} : it's way out of range"
                    .format(original_angle))
        while angle < mininum:
            i += 1
            angle += 360
            if i > 10:
                raise ValueError(
                    "Failed to normalize provided angle of {} : it's way out of range"
                    .format(original_angle))
        return angle

    return normalize_angle(az_ab)
