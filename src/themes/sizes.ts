import { Dimensions } from 'react-native';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

const { width, height } = Dimensions.get('window');

export const SIZES = {
  wp,
  hp,
  width,
  height,
};

export const SIZE = (size: number) => {
  return SIZES.wp(size / 4.2);
};
