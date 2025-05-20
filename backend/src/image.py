"""
Provides tools for importing images.
"""

import queue
import os
import logging
from math import degrees

import backend.src.geo as geo

logger = logging.getLogger(__name__)

supported_image_formats = [
    "bmp", "gif", "jpg", "jpeg", "png", "pbm", "pgm", "ppm", "xbm", "xpm"
]
supported_info_formats = ["txt"]

images = {}  # Dictionary of images by id so we can avoid creating duplicates.


class Image(object):
    # This is static method because it doesn't need access to the instance and
    # we want to be able to call it from __new__() (when the instance doesn't
    # exist yet). It's basically just a normal function, but belonging to this
    # class.
    @staticmethod
    def parseFilePath(path):
        """
        Parses a filepath, returning a tuple with four parts:
        * The directory of the file (ex. /home/bob/)
        * The complete filename (ex. hello.txt)
        * The name part of the filename (ex. hello)
        * The extension part of the filename (ex. txt)
        """
        head, tail = os.path.split(path)
        filename, extension = os.path.splitext(tail)
        return (head, tail, filename, extension)

    # __new__() is what actually makes a new instance of a class. Called immediately
    # before __init__(). Overriding it so that we can reuse an existing instance instead
    # of creating a new one when the id is the same. Needed for multi-operator support
    # since images objects can be created two different ways: as part of a feature and
    # when a new image file is found. We want the two to end up refering to the same object
    def __new__(cls, *args):
        _, id_, _, _ = cls.parseFilePath(args[0])  # The filename is the id

        existing_image = images.get(id_)
        if existing_image:
            return existing_image
        else:
            image = super().__new__(cls)
            images[id_] = image
            return image

    def __init__(self, image_path, info_path):
        self._parsePaths(image_path, info_path)
        self._readInfo()
        self._prepareProperties()

        self.width = None  # Automatically set later when image read
        self.height = None  # Automatically set later when  image read
        self.georeference = None

    def __str__(self):
        return "Image %s" % self.name

    def __repr__(self):
        return "Image(name=%r)" % self.name

    def __getstate__(self):
        """
        Called during pickling. Removing the attributes that are no longer valid on another machine.
        """
        state = self.__dict__.copy()
        state["path"] = None
        state["info_path"] = None
        return state

    def __setstate__(self, data):
        # Only setting the __dict__ if self is a new instance:
        if not hasattr(self, "id"):
            self.__dict__ = data

    def __getnewargs__(self):
        """
        Called during pickling. Saves the args to be provided to __new__() during unpickling.
        Necessary so that __new__() knows the information it needs to tell if this image
        exists already or not.
        """
        return (self.filename, self.info_filename)

    def _parsePaths(self, image_path, info_path):
        """
        Parses the image and info paths and stores the needed attributes.
        """
        self.path = image_path
        _, self.filename, self.name, _ = self.parseFilePath(image_path)
        self.id = self.name

        self.info_path = info_path
        _, self.info_filename, _, _ = self.parseFilePath(info_path)

    def _readInfo(self):
        """
        Populates info_data with the data from the info file.
        """
        self.info_data = {}
        with open(self.info_path) as f:
            for line in f:
                key, sep, value = line.partition("=")
                self.info_data[key.strip()] = value.strip()
        return self.info_data

    def _prepareProperties(self):
        """
        Groups the raw data into Position and Orientation objects.
        """

        # Going through some extra effort to be able to surface a
        # list of missing fields, not just the first missing one
        # for a more user-friendly error message.
        field_map = {
            "easting": "utm_east",
            "northing": "utm_north",
            "zone": "utm_zone",
            "height": "z",
            "alt": "z",
            "pitch": "theta",
            "roll": "phi",
            "yaw": "psi"
        }

        missing_fields = [
            field for field in field_map.values()
            if field not in self.info_data.keys()
        ]

        if len(missing_fields) != 0:
            raise KeyError("Missing %s field(s) from info file." %
                           ", ".join(missing_fields))

        # Ensuring we don't let in any infinities or Nan's (both are valid for floats, but not integers):
        for field in field_map.values():
            try:
                int(float(self.info_data[field]))
            except (ValueError, OverflowError) as e:
                raise ValueError("%s for field '%s'" % (e, field))

        easting = float(self.info_data[field_map["easting"]]) / 100
        northing = float(self.info_data[field_map["northing"]]) / 100
        zone = int(self.info_data[field_map["zone"]])
        height = float(self.info_data[field_map["height"]])
        alt = float(self.info_data[field_map["alt"]])
        pitch = degrees(float(self.info_data[field_map["pitch"]])
                        ) * -1  # top of camera pointing towards plane tail
        roll = degrees(float(self.info_data[field_map["roll"]])
                       ) * -1  # top of camera pointing towards plane tail
        yaw = degrees(float(self.info_data[
            field_map["yaw"]]))  # top of camera pointing towards plane tail
        # yaw is absolute comparison to north, can't just flip

        lat, lon = geo.utm_to_DD(easting, northing, zone)
        self.plane_position = geo.Position(lat, lon, height, alt)
        self.plane_orientation = geo.Orientation(pitch, roll, yaw)

    def _prepareGeo(self):
        """
        Prepares all the data needed to perform geo-referencing on
        this image into a georeference object. Will raise an Exception
        if anything important is missing (ex. image width or height).
        """
        if not self.width:
            raise Exception("Can't geo-reference image. Missing image width.")
        if not self.height:
            raise Exception("Can't geo-reference image. Missing image height.")

        field_of_view_horiz = 58.38  # Hardcoded for now. Should come from the UAV in the info file eventually.
        field_of_view_vert = 48.25

        self.camera_specs = geo.CameraSpecs(self.width, self.height,
                                            field_of_view_horiz,
                                            field_of_view_vert)
        self.georeference = geo.GeoReference(self.camera_specs)

    def _requireGeo(self):
        if not self.georeference:
            self._prepareGeo()

    def geoReferencePoint(self, pixel_x, pixel_y):
        """
        Determines the position of the location on the ground visible
        at pixel.
        """
        self._requireGeo()
        return self.georeference.pointInImage(self.plane_position,
                                              self.plane_orientation, pixel_x,
                                              pixel_y)

    def invGeoReferencePoint(self, position):
        """
        Determines the pixel that depicts the location at the provided
        position.
        """
        self._requireGeo()
        return self.georeference.pointOnImage(self.plane_position,
                                              self.plane_orientation, position)

    def getPlanePlumbPixel(self):
        """
        Returns a tuple of the x and y values of the pixel corresponding
        to the point in the image that's located directly below the plane.

        Returns None, None if the point isn't in the image.
        """
        self._requireGeo()
        return self.georeference.pointBelowPlane(self.plane_position,
                                                 self.plane_orientation)

    def distance(self, point_a, point_b):
        """
        Returns the distance between the two points on the ground
        refered to by the provided pixel locations.
        """
        self._requireGeo()
        positions = [
            self.geoReferencePoint(*point_a),
            self.geoReferencePoint(*point_b)
        ]
        return geo.PositionCollection(positions).length()

    def heading(self, point_a, point_b):
        """
        Returns the heading between the two points on the ground referred to
        by the provided pixel locations.
        """
        self._requireGeo()
        positions = [
            self.geoReferencePoint(*point_a),
            self.geoReferencePoint(*point_b)
        ]
        return geo.heading_between_positions(positions[0], positions[1])

    def getImageOutline(self):
        """
        Returns a PositionCollection that describes the area of the
        ground that the picture covers.
        """
        positions = []
        corners = [(0, self.height), (self.width, self.height),
                   (self.width, 0), (0, 0)]  # All corners of the image
        for x, y in corners:
            positions.append(self.geoReferencePoint(x, y))
        return geo.PositionCollection(positions)


class ImageCrop:
    """
    Represents a cropped area of a particular image.
    """

    def __init__(self, image, center, offset):
        self.image = image
        self.center = center
        self.offset = offset

    @property
    def min_x(self):
        return self.center[0] - self.offset

    @property
    def max_x(self):
        return self.center[0] + self.offset

    @property
    def min_y(self):
        return self.center[1] - self.offset

    @property
    def max_y(self):
        return self.center[1] + self.offset

    @property
    def top_left(self):
        return (self.min_x, self.min_y)

    @property
    def bottom_right(self):
        return (self.max_x, self.max_y)


class Watcher:
    # Empty watcher class
    # This will have to be replaced by something else as we no longer use pyinotify

    def __init__(self):
        # this is still defined as some components rely on these variables
        self.queue = queue.Queue()
        self.pending_images = {}
        self.pending_infos = {}

    # no-op old Watcher class methods
    def createImage(self, image_pathname, info_pathname):
        pass

    def loadExistingImages(self, path):
        pass

    def setDirectory(self, path):
        pass

    def start(self):
        pass

    def stop(self):
        pass
