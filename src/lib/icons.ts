/**
 * Icon registry — Phosphor "Light" icons (MIT licence), inlined at build time
 * so no icon font or extra request is needed. To add an icon, find its name at
 * https://phosphoricons.com, then add one import + one entry below.
 */
import airplaneTilt from '@phosphor-icons/core/assets/light/airplane-tilt-light.svg?raw';
import arrowRight from '@phosphor-icons/core/assets/light/arrow-right-light.svg?raw';
import arrowLeft from '@phosphor-icons/core/assets/light/arrow-left-light.svg?raw';
import arrowUpRight from '@phosphor-icons/core/assets/light/arrow-up-right-light.svg?raw';
import arrowSquareOut from '@phosphor-icons/core/assets/light/arrow-square-out-light.svg?raw';
import arrowsClockwise from '@phosphor-icons/core/assets/light/arrows-clockwise-light.svg?raw';
import bank from '@phosphor-icons/core/assets/light/bank-light.svg?raw';
import calendarBlank from '@phosphor-icons/core/assets/light/calendar-blank-light.svg?raw';
import calendarCheck from '@phosphor-icons/core/assets/light/calendar-check-light.svg?raw';
import caretDown from '@phosphor-icons/core/assets/light/caret-down-light.svg?raw';
import caretLeft from '@phosphor-icons/core/assets/light/caret-left-light.svg?raw';
import caretRight from '@phosphor-icons/core/assets/light/caret-right-light.svg?raw';
import certificate from '@phosphor-icons/core/assets/light/certificate-light.svg?raw';
import chartLineUp from '@phosphor-icons/core/assets/light/chart-line-up-light.svg?raw';
import check from '@phosphor-icons/core/assets/light/check-light.svg?raw';
import checkCircle from '@phosphor-icons/core/assets/light/check-circle-light.svg?raw';
import clock from '@phosphor-icons/core/assets/light/clock-light.svg?raw';
import coins from '@phosphor-icons/core/assets/light/coins-light.svg?raw';
import downloadSimple from '@phosphor-icons/core/assets/light/download-simple-light.svg?raw';
import envelopeSimple from '@phosphor-icons/core/assets/light/envelope-simple-light.svg?raw';
import handCoins from '@phosphor-icons/core/assets/light/hand-coins-light.svg?raw';
import handHeart from '@phosphor-icons/core/assets/light/hand-heart-light.svg?raw';
import heartbeat from '@phosphor-icons/core/assets/light/heartbeat-light.svg?raw';
import hourglassMedium from '@phosphor-icons/core/assets/light/hourglass-medium-light.svg?raw';
import houseLine from '@phosphor-icons/core/assets/light/house-line-light.svg?raw';
import info from '@phosphor-icons/core/assets/light/info-light.svg?raw';
import leaf from '@phosphor-icons/core/assets/light/leaf-light.svg?raw';
import list from '@phosphor-icons/core/assets/light/list-light.svg?raw';
import magnifyingGlassPlus from '@phosphor-icons/core/assets/light/magnifying-glass-plus-light.svg?raw';
import mapPin from '@phosphor-icons/core/assets/light/map-pin-light.svg?raw';
import minus from '@phosphor-icons/core/assets/light/minus-light.svg?raw';
import phone from '@phosphor-icons/core/assets/light/phone-light.svg?raw';
import pill from '@phosphor-icons/core/assets/light/pill-light.svg?raw';
import phoneCall from '@phosphor-icons/core/assets/light/phone-call-light.svg?raw';
import piggyBank from '@phosphor-icons/core/assets/light/piggy-bank-light.svg?raw';
import plus from '@phosphor-icons/core/assets/light/plus-light.svg?raw';
import quotes from '@phosphor-icons/core/assets/light/quotes-light.svg?raw';
import sealCheck from '@phosphor-icons/core/assets/light/seal-check-light.svg?raw';
import shieldCheck from '@phosphor-icons/core/assets/light/shield-check-light.svg?raw';
import star from '@phosphor-icons/core/assets/light/star-light.svg?raw';
import stethoscope from '@phosphor-icons/core/assets/light/stethoscope-light.svg?raw';
import umbrella from '@phosphor-icons/core/assets/light/umbrella-light.svg?raw';
import usersThree from '@phosphor-icons/core/assets/light/users-three-light.svg?raw';
import userCircle from '@phosphor-icons/core/assets/light/user-circle-light.svg?raw';
import videoCamera from '@phosphor-icons/core/assets/light/video-camera-light.svg?raw';
import warningCircle from '@phosphor-icons/core/assets/light/warning-circle-light.svg?raw';
import x from '@phosphor-icons/core/assets/light/x-light.svg?raw';

export const ICONS = {
  'airplane-tilt': airplaneTilt,
  'arrow-right': arrowRight,
  'arrow-left': arrowLeft,
  'arrow-up-right': arrowUpRight,
  'arrow-square-out': arrowSquareOut,
  'arrows-clockwise': arrowsClockwise,
  bank,
  'calendar-blank': calendarBlank,
  'calendar-check': calendarCheck,
  'caret-down': caretDown,
  'caret-left': caretLeft,
  'caret-right': caretRight,
  certificate,
  'chart-line-up': chartLineUp,
  check,
  'check-circle': checkCircle,
  clock,
  coins,
  download: downloadSimple,
  envelope: envelopeSimple,
  'hand-coins': handCoins,
  'hand-heart': handHeart,
  heartbeat,
  hourglass: hourglassMedium,
  'house-line': houseLine,
  info,
  leaf,
  list,
  zoom: magnifyingGlassPlus,
  'map-pin': mapPin,
  minus,
  phone,
  'phone-call': phoneCall,
  'piggy-bank': piggyBank,
  pill,
  plus,
  quotes,
  'seal-check': sealCheck,
  'shield-check': shieldCheck,
  star,
  stethoscope,
  umbrella,
  'users-three': usersThree,
  'user-circle': userCircle,
  video: videoCamera,
  'warning-circle': warningCircle,
  x,
} as const;

export type IconName = keyof typeof ICONS;
